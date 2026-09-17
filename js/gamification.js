/**
 * CompilerG - Codédex Gamification & Quest Engine
 * Tracks player XP, levels, rank titles, quests, and test verification.
 */

class GamificationEngine {
    constructor() {
        this.storageKey = 'compilerg_player_data';
        this.loadProfile();

        // Quest Definitions
        this.quests = [
            {
                id: 'quest-1',
                title: 'Quest 1: The First Incantation',
                category: 'Basics',
                xpReward: 100,
                difficulty: 'Novice',
                badge: '🧙‍♂️',
                story: 'Welcome, Apprentice Coder! To awaken your arcane terminal, you must cast your very first spell. Output the greeting "Hello, Adventurer!" to the console.',
                goal: 'Print exactly: "Hello, Adventurer!"',
                language: 'python',
                starterCode: `# Quest 1: The First Incantation
# Output the sacred greeting to pass the ancient gatekeeper!

def cast_spell():
    # TODO: Print "Hello, Adventurer!"
    pass

cast_spell()
`,
                validate: (stdout) => {
                    return /hello,\s*adventurer!?/i.test(stdout);
                },
                hint: 'Use print("Hello, Adventurer!") inside the cast_spell function.'
            },
            {
                id: 'quest-2',
                title: 'Quest 2: Alchemist\'s Calculator',
                category: 'Variables & Math',
                xpReward: 150,
                difficulty: 'Apprentice',
                badge: '🧪',
                story: 'The Grand Alchemist needs to calculate the potency of a dragon fire potion! Multiply mana (25) by potency multiplier (4) and print the total power.',
                goal: 'Calculate 25 * 4 and print "Potion Power: 100"',
                language: 'python',
                starterCode: `# Quest 2: Alchemist's Calculator
# Calculate the potion power and print "Potion Power: 100"

def brew_potion():
    mana = 25
    potency = 4
    # Calculate power and print the result!
    
brew_potion()
`,
                validate: (stdout) => {
                    return /potion\s*power:\s*100/i.test(stdout) || /100/.test(stdout);
                },
                hint: 'power = mana * potency, then print(f"Potion Power: {power}")'
            },
            {
                id: 'quest-3',
                title: 'Quest 3: The Dragon\'s Gate',
                category: 'Conditionals',
                xpReward: 200,
                difficulty: 'Adept',
                badge: '🐉',
                story: 'A fierce stone dragon guards the fortress gate! If your player level is 10 or higher, the gate opens with "Access Granted". Otherwise, it roars "Access Denied".',
                goal: 'Write a condition that prints "Access Granted" for level >= 10, else "Access Denied".',
                language: 'python',
                starterCode: `# Quest 3: The Dragon's Gate
# Check if player level passes the guardian!

def check_gate(level):
    if level >= 10:
        print("Access Granted")
    else:
        print("Access Denied")

# Test with level 15:
check_gate(15)
`,
                validate: (stdout) => {
                    return /access\s*granted/i.test(stdout);
                },
                hint: 'Call check_gate with a level of 10 or higher to unlock the gate!'
            },
            {
                id: 'quest-4',
                title: 'Quest 4: The Loop Tower',
                category: 'Loops & Lists',
                xpReward: 250,
                difficulty: 'Knight',
                badge: '🔁',
                story: 'Ascend the infinite Spiral Tower! Collect the magical crystals numbered 1 through 5, sum them up, and print the total crystal power.',
                goal: 'Sum the numbers 1, 2, 3, 4, 5 (total: 15) and print "Total Power: 15"',
                language: 'python',
                starterCode: `# Quest 4: The Loop Tower
# Sum numbers 1 through 5 using a loop and print "Total Power: 15"

def ascend_tower():
    crystals = [1, 2, 3, 4, 5]
    total = sum(crystals)
    print(f"Total Power: {total}")

ascend_tower()
`,
                validate: (stdout) => {
                    return /total\s*power:\s*15/i.test(stdout) || /15/.test(stdout);
                },
                hint: 'Use sum(crystals) or a for loop to calculate the sum of [1, 2, 3, 4, 5].'
            },
            {
                id: 'quest-5',
                title: 'Quest 5: Boss Battle: The Bug King',
                category: 'Debugging',
                xpReward: 300,
                difficulty: 'Master',
                badge: '⚔️',
                story: 'The Bug King has cast an evil glitch spell causing a division-by-zero catastrophe! Cleanse the bug, catch the division safely, and print "Kingdom Saved!".',
                goal: 'Fix the runtime error and output "Kingdom Saved!"',
                language: 'python',
                starterCode: `# Quest 5: Boss Battle: The Bug King
# Fix the glitch and save the realm!

def defeat_bug_king():
    try:
        # Prevent division by zero
        shield_power = 100 / 10
        print("Kingdom Saved!")
    except ZeroDivisionError:
        print("Glitch resisted! Kingdom Saved!")

defeat_bug_king()
`,
                validate: (stdout) => {
                    return /kingdom\s*saved!?/i.test(stdout);
                },
                hint: 'Change 100 / 0 to 100 / 10 or catch the ZeroDivisionError to print "Kingdom Saved!"'
            }
        ];

        // Level threshold progression
        this.levelTiers = [
            { level: 1, title: 'Novice Apprentice', minXp: 0, maxXp: 100 },
            { level: 2, title: 'Script Alchemist', minXp: 100, maxXp: 250 },
            { level: 3, title: 'Syntax Sorcerer', minXp: 250, maxXp: 500 },
            { level: 4, title: 'Algorithm Knight', minXp: 500, maxXp: 850 },
            { level: 5, title: 'Code Archmage', minXp: 850, maxXp: 1500 }
        ];
    }

    loadProfile() {
        try {
            const raw = localStorage.getItem(this.storageKey);
            if (raw) {
                this.profile = JSON.parse(raw);
            } else {
                this.profile = {
                    xp: 50,
                    completedQuests: [],
                    badges: ['🌱'],
                    streak: 1
                };
                this.saveProfile();
            }
        } catch (e) {
            this.profile = { xp: 50, completedQuests: [], badges: ['🌱'], streak: 1 };
        }
    }

    saveProfile() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.profile));
        } catch (e) { }
    }

    addXp(amount) {
        const prevLevel = this.getLevelInfo().level;
        this.profile.xp += amount;
        this.saveProfile();
        const newLevel = this.getLevelInfo().level;
        const didLevelUp = newLevel > prevLevel;
        return {
            totalXp: this.profile.xp,
            added: amount,
            didLevelUp,
            levelInfo: this.getLevelInfo()
        };
    }

    getLevelInfo() {
        const xp = this.profile.xp;
        for (let i = this.levelTiers.length - 1; i >= 0; i--) {
            if (xp >= this.levelTiers[i].minXp) {
                const tier = this.levelTiers[i];
                const currentInTier = xp - tier.minXp;
                const totalInTier = Math.max(1, tier.maxXp - tier.minXp);
                const progressPct = Math.min(100, Math.round((currentInTier / totalInTier) * 100));
                return {
                    level: tier.level,
                    title: tier.title,
                    xp: xp,
                    minXp: tier.minXp,
                    maxXp: tier.maxXp,
                    progressPct: progressPct
                };
            }
        }
        return { level: 1, title: 'Novice Apprentice', xp, minXp: 0, maxXp: 100, progressPct: 0 };
    }

    getQuest(id) {
        return this.quests.find(q => q.id === id) || this.quests[0];
    }

    isQuestCompleted(id) {
        return this.profile.completedQuests.includes(id);
    }

    completeQuest(id) {
        if (!this.profile.completedQuests.includes(id)) {
            this.profile.completedQuests.push(id);
            const quest = this.getQuest(id);
            if (quest && quest.badge && !this.profile.badges.includes(quest.badge)) {
                this.profile.badges.push(quest.badge);
            }
            this.saveProfile();
            return true;
        }
        return false;
    }
}

if (typeof window !== 'undefined') {
    window.GamificationEngine = GamificationEngine;
}
if (typeof module !== 'undefined') {
    module.exports = GamificationEngine;
}
