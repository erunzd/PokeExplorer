// src/utils/NotificationService.js
import notifee, { AndroidImportance } from '@notifee/react-native';

const CHANNEL_ID = 'poke-encounters';

// 1. Initialize the channel (Call this once)
export const configureNotifications = async () => {
    // Request permission (required for iOS and Android 13+)
    await notifee.requestPermission();

    // Create a channel for Android (required for Android)
    await notifee.createChannel({
        id: CHANNEL_ID,
        name: 'Pokémon Encounters',
        importance: AndroidImportance.HIGH,
        sound: 'default',
        vibration: true,
    });
};

// 2. Trigger the notification
export const notifyNearbyPokemon = async (pokemonName) => {
    await notifee.displayNotification({
        title: 'A Wild Pokémon Appeared!',
        body: `A wild ${pokemonName} is nearby! Tap to encounter.`,
        android: {
            channelId: CHANNEL_ID,
            smallIcon: 'ic_launcher', // Defaults to your app icon
            pressAction: {
                id: 'default',
            },
        },
        ios: {
            sound: 'default',
        }
    });
};

export default configureNotifications;