// src/utils/GamificationService.js

import AsyncStorage from '@react-native-async-storage/async-storage';

// --- CONFIGURATION ---

// XP needed to reach a level (Level 1 starts at 0 XP)
// Example: Level 2 requires 100 XP, Level 3 requires 250 XP
const LEVEL_XP_REQUIREMENTS = {
    1: 0,    // Level 1: 0 XP
    2: 100,  // Level 2: 100 XP total
    3: 250,  // Level 3: 250 XP total
    4: 500,  // Level 4: 500 XP total
    5: 800,
    6: 1200,
    7: 1700,
    8: 2300,
    9: 3000,
    10: 4000, // Max level for now
};

// XP awarded for actions
const XP_AWARDS = {
    POKEMON_CAPTURE: 50,
    DAILY_CHALLENGE_COMPLETE: 150,
    FIRST_DISCOVERY_POST: 200, // One-time bonus
};

// Badge Definitions (Keyed by a unique ID)
export const BADGES = {
    KANTO: { id: 'KANTO', title: 'Kanto Explorer', target: 5 }, // Catch 5 Kanto Pokémon (ID 1-151)
    SOCIALITE: { id: 'SOCIALITE', title: 'Social Trainer', target: 1 }, // Post 1 discovery
    DAILY_VETERAN: { id: 'DAILY_VETERAN', title: 'Daily Veteran', target: 7 }, // Complete 7 daily challenges
};

export const DEFAULT_PROGRESS = {
    xp: 0,
    level: 1,
    badges: [], // Array of obtained badge IDs (e.g., ['KANTO', 'SOCIALITE'])
    dailyChallengeStatus: {
        completed: false,
        lastCompletionDate: null,
        pokemonType: null, // Type to search for today
        targetCount: 1,
    }
};

const PROGRESS_KEY = (email) => `@user_progress_${email.trim()}`;

// --- CORE LOGIC FUNCTIONS ---

/**
 * Calculates the current level based on total XP.
 * @param {number} totalXP
 * @returns {number} The current level.
 */
export const getLevelFromXP = (totalXP) => {
    let level = 1;
    for (const [lvl, xpReq] of Object.entries(LEVEL_XP_REQUIREMENTS)) {
        if (totalXP >= xpReq) {
            level = parseInt(lvl);
        } else {
            break;
        }
    }
    return level;
};

/**
 * Gets the XP required to start the next level.
 * @param {number} currentLevel
 * @returns {number} Total XP required for the NEXT level.
 */
export const getXPForNextLevel = (currentLevel) => {
    const nextLevel = currentLevel + 1;
    return LEVEL_XP_REQUIREMENTS[nextLevel] || LEVEL_XP_REQUIREMENTS[currentLevel]; // Returns current max XP if already at max level
};

// --- ASYNC STORAGE HANDLERS ---

/**
 * Loads the user's progress from AsyncStorage.
 * @param {string} email
 * @returns {Promise<object>}
 */
export const loadUserProgress = async (email) => {
    if (!email) return DEFAULT_PROGRESS;

    try {
        const jsonValue = await AsyncStorage.getItem(PROGRESS_KEY(email));
        // Merge stored data with defaults to ensure all keys exist
        return jsonValue != null ? { ...DEFAULT_PROGRESS, ...JSON.parse(jsonValue) } : DEFAULT_PROGRESS;
    } catch (e) {
        console.error("Error loading user progress:", e);
        return DEFAULT_PROGRESS;
    }
};

/**
 * Saves the user's progress to AsyncStorage.
 * @param {string} email
 * @param {object} progress
 * @returns {Promise<void>}
 */
const saveUserProgress = async (email, progress) => {
    if (!email) return;

    try {
        const jsonValue = JSON.stringify(progress);
        await AsyncStorage.setItem(PROGRESS_KEY(email), jsonValue);
    } catch (e) {
        console.error("Error saving user progress:", e);
    }
};

/**
 * Updates the user's XP and checks for level up and badges.
 * @param {string} email - The user's email.
 * @param {string} type - The type of action (e.g., POKEMON_CAPTURE).
 * @param {string} [pokemonId] - Optional, for badge tracking (e.g., Kanto badge).
 * @returns {Promise<object>} Returns the updated progress object.
 */
export const awardXPAndCheckBadges = async (email, type, pokemonId = null) => {
    const progress = await loadUserProgress(email);
    const xpAward = XP_AWARDS[type] || 0;

    progress.xp += xpAward;

    // 1. Check for Level Up (If the level changes, it prints a message)
    const newLevel = getLevelFromXP(progress.xp);
    if (newLevel > progress.level) {
        alert(`Congratulations! You leveled up to Level ${newLevel}!`);
        progress.level = newLevel;
    }

    // 2. Check for Badges (Simplified check example)
    // NOTE: Real badge checking (like counting specific type catches) needs data persistence (Firestore or dedicated AsyncStorage key).

    // Example: Check Socialite Badge on first discovery post
    if (type === 'FIRST_DISCOVERY_POST' && !progress.badges.includes(BADGES.SOCIALITE.id)) {
        progress.badges.push(BADGES.SOCIALITE.id);
        alert(`Badge Unlocked: ${BADGES.SOCIALITE.title}!`);
    }

    await saveUserProgress(email, progress);
    return progress;
};