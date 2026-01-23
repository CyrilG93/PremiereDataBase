// Background Service for Data Base Extension
// Handles SpellBook commands even when the main panel is closed

const csInterface = new CSInterface();

// Use esm package to load ES Module compatible npm packages
const esmRequire = require('esm')(module);
const Spellbook = esmRequire('@knights-of-the-editing-table/spell-book').default;

const commands = [
    {
        commandID: 'com.database.premiere.showPanel',
        name: 'Show Database Panel',
        group: 'Panel',
        action: () => {
            console.log('Main Panel Open Requested via Shortcut');
            csInterface.requestOpenExtension("com.database.premiere.panel", "");
        }
    }
];

// Initialize Spellbook for the background service
const spellbook = new Spellbook('Data Base Service', 'com.database.premiere.service', commands);

console.log('Background Service Initialized');
