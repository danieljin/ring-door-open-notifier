import 'dotenv/config';
import { RingApi } from 'ring-client-api';
import { readFile, writeFile } from 'fs';
import { promisify } from 'util';
import nodemailer from 'nodemailer';

process.setMaxListeners(20);

const maxNotifications: number = parseInt(process.env.MAX_NOTIFICATIONS || '5');
const notificationInterval: number = parseInt(process.env.NOTIFICATION_INTERVAL || '30000');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Function to send email
function sendNotification(deviceName: string, message: string) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: 'trigger@applet.ifttt.com',
    subject: `#DoorOpen`,
    text: message,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log('Error sending email:', error);
    } else {
      console.log('Email sent:', info.response);
    }
  });
}

async function monitorDoors() {
  const { env } = process,
    ringApi = new RingApi({
      refreshToken: env.RING_REFRESH_TOKEN!,
      debug: true,
    }),
    locations = await ringApi.getLocations();

  ringApi.onRefreshTokenUpdated.subscribe(
    async ({ newRefreshToken, oldRefreshToken }) => {
      console.log('Refresh Token Updated: ', newRefreshToken);

      // If you are implementing a project that use `ring-client-api`, you should subscribe to onRefreshTokenUpdated and update your config each time it fires an event
      // Here is an example using a .env file for configuration
      if (!oldRefreshToken) {
        process.exit();
      }

      const currentConfig = await promisify(readFile)('.env'),
        updatedConfig = currentConfig
          .toString()
          .replace(oldRefreshToken, newRefreshToken);

      await promisify(writeFile)('.env', updatedConfig);
    }
  );

  let targetLocation;

  if (!process.env.LOCATION_ID || process.env.LOCATION_ID.toLowerCase() === 'default') {
    console.log(`\nLOCATION_ID set to "All". First location found will be used.`)
    targetLocation = locations[0];
  } else {
    targetLocation = locations.find(location => location.id === process.env.LOCATION_ID);
  }
  
  if (!targetLocation) {
    console.error(`\nLocation "${process.env.LOCATION_ID}" was not found.`);
    console.error(`Available locations:`);
    locations.forEach(location => {
      console.error(`- ${location.name}(${location.id})`);
    });
    process.exit();
  }
  
  console.log(`\nLocation set to ${targetLocation.name}(${targetLocation.id}).`);

  const devices = await targetLocation.getDevices();

  let contactDevices = devices
    .filter(device => device.deviceType === 'sensor.contact');

  if (contactDevices.length === 0) {
    console.error(`\nNo contact sensors were found.`);
    process.exit();
  }

  if (!process.env.DEVICE_ZIDS || process.env.DEVICE_ZIDS.toLowerCase() === 'all') {
    console.log(`\nDEVICE_ZIDS set to "All". Monitoring all contact sensors:`);

    contactDevices.forEach(contactDevice => {
      console.log(`- ${contactDevice.name}(${contactDevice.zid})`);
    });
  } else {
    let contactDeviceZids = process.env.DEVICE_ZIDS.split(',').map(zid => zid.trim()).filter(Boolean);
    contactDevices = contactDevices.filter(contactDevice => contactDeviceZids.includes(contactDevice.zid));
    
    if (contactDevices.length != contactDeviceZids.length) {
      console.error(`\nNot all specified contact sensors "${process.env.DEVICE_ZIDS}" were found. Please check the list of contact sensors for valid ZIDs:`);
      
      contactDevices.forEach(contactDevice => {
        console.error(`- ${contactDevice.name}(${contactDevice.zid})`);
      });

      process.exit();
    }
  }

  console.log('\n');

  for (const contactDevice of contactDevices) {
    console.log(`Monitoring ${contactDevice.name}.`);

    let doorOpenTimer: NodeJS.Timeout | null = null;
    let notificationCount = 0;

    contactDevice.onData.subscribe((data) => {
      // Check if the device is faulted (i.e., door is open)
      const isFaulted = data?.faulted;

      if (!isFaulted) {
        console.log(`${contactDevice.name} is closed.`);
        notificationCount = 0;
        if (doorOpenTimer) {
          clearTimeout(doorOpenTimer);
          doorOpenTimer = null;
        }
      } else {
        console.log(`${contactDevice.name} is open.`);
        if (!doorOpenTimer) {
          doorOpenTimer = setTimeout(() => {
            if (notificationCount < maxNotifications) {
              console.log(`${contactDevice.name} has been left open for ${30 * (notificationCount + 1)} seconds!`);
              sendNotification(contactDevice.name, `${contactDevice.name} has been left open for ${30 * (notificationCount + 1)} seconds!`);
              notificationCount++;
            } else {
              console.log(`${contactDevice.name} has been opened for too long! No more notifications will be sent.`);
              sendNotification(contactDevice.name, `${contactDevice.name} has been opened for too long! No more notifications will be sent.`);
              clearInterval(doorOpenTimer!);
              doorOpenTimer = null;
            }
          }, notificationInterval);
        }
      }
    });
  }
}

monitorDoors();
