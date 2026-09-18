/**
 * CompilerG - Default Boilerplate Codes
 * High quality starter code for each supported language.
 */

const BOILERPLATES = {
    python: `# Online Python 3 Compiler - CompilerG
# Write your code here or test with standard input (STDIN tab)
import sys

def solve():
    print("Welcome to CompilerG!")
    
    # Read input: reads from STDIN tab or defaults gracefully
    name = sys.stdin.readline().strip() or "Developer"
    print(f"Hello, {name}! Happy coding.")
    
    # Calculate sum of numbers
    numbers = [1, 2, 3, 4, 5]
    print(f"Sum of numbers {numbers} is {sum(numbers)}")

if __name__ == "__main__":
    solve()
`,

    cpp: `// Online C++ Compiler - CompilerG
#include <iostream>
#include <vector>
#include <string>

using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    cout << "Welcome to CompilerG C++ Compiler!" << endl;
    
    string name;
    if (cin >> name) {
        cout << "Hello, " << name << "! Happy coding." << endl;
    } else {
        cout << "Hello, Developer! Provide input in the STDIN tab." << endl;
    }
    
    vector<int> numbers = {10, 20, 30, 40, 50};
    int total = 0;
    for (int num : numbers) {
        total += num;
    }
    
    cout << "Sum of elements: " << total << endl;
    return 0;
}
`,

    c: `// Online C Compiler - CompilerG
#include <stdio.h>

int main() {
    printf("Welcome to CompilerG C Compiler!\\n");
    
    char name[100];
    if (scanf("%99s", name) == 1) {
        printf("Hello, %s! Happy coding.\\n", name);
    } else {
        printf("Hello, Developer! Provide input in the STDIN tab.\\n");
    }
    
    int sum = 0;
    for (int i = 1; i <= 5; i++) {
        sum += i;
    }
    printf("Sum from 1 to 5: %d\\n", sum);
    
    return 0;
}
`,

    java: `// Online Java Compiler - CompilerG
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        System.out.println("Welcome to CompilerG Java Compiler!");
        
        Scanner scanner = new Scanner(System.in);
        if (scanner.hasNext()) {
            String name = scanner.next();
            System.out.println("Hello, " + name + "! Happy coding.");
        } else {
            System.out.println("Hello, Developer! Provide input in the STDIN tab.");
        }
        
        int[] arr = {2, 4, 6, 8, 10};
        int sum = 0;
        for (int val : arr) {
            sum += val;
        }
        System.out.println("Array sum: " + sum);
        
        scanner.close();
    }
}
`,

    javascript: `// Online JavaScript (Node.js) Runner - CompilerG
const readline = require('readline');

console.log("Welcome to CompilerG JavaScript Console!");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('', (name) => {
    const user = name.trim() || 'Developer';
    console.log(\`Hello, \${user}! Happy coding.\`);
    
    const nums = [5, 10, 15, 20];
    const total = nums.reduce((acc, curr) => acc + curr, 0);
    console.log(\`Total sum of [\${nums}]: \${total}\`);
    
    rl.close();
});
`,

    typescript: `// Online TypeScript Compiler - CompilerG
console.log("Welcome to CompilerG TypeScript!");

interface User {
    name: string;
    role: string;
    skills: string[];
}

const developer: User = {
    name: "Alex",
    role: "Full Stack Engineer",
    skills: ["TypeScript", "Python", "Rust", "C++"]
};

console.log(\`User: \${developer.name} (\${developer.role})\`);
console.log(\`Skills: \${developer.skills.join(', ')}\`);

function addNumbers(a: number, b: number): number {
    return a + b;
}

console.log(\`Result of 25 + 75 = \${addNumbers(25, 75)}\`);
`,

    html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CompilerG Live Preview</title>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
            color: #f8fafc;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 90vh;
            margin: 0;
            padding: 20px;
        }
        .card {
            background: rgba(30, 41, 59, 0.7);
            border: 1px solid rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(12px);
            padding: 2rem;
            border-radius: 16px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
            max-width: 450px;
            animation: fadeIn 0.8s ease-out;
        }
        h1 {
            color: #38bdf8;
            margin-top: 0;
        }
        button {
            background: #6366f1;
            color: white;
            border: none;
            padding: 10px 20px;
            font-size: 1rem;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
            font-weight: 600;
        }
        button:hover {
            background: #4f46e5;
            transform: translateY(-2px);
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
    </style>
</head>
<body>
    <div class="card">
        <h1>Hello from CompilerG!</h1>
        <p>This is a live interactive HTML/CSS/JS sandbox.</p>
        <button id="counterBtn">Clicks: 0</button>
    </div>

    <script>
        let count = 0;
        const btn = document.getElementById('counterBtn');
        btn.addEventListener('click', () => {
            count++;
            btn.textContent = 'Clicks: ' + count;
            console.log('Button clicked! New count:', count);
        });
    </script>
</body>
</html>
`,

    go: `// Online Go Compiler - CompilerG
package main

import (
    "bufio"
    "fmt"
    "os"
    "strings"
)

func main() {
    fmt.Println("Welcome to CompilerG Go Runner!")
    
    scanner := bufio.NewScanner(os.Stdin)
    if scanner.Scan() {
        name := strings.TrimSpace(scanner.Text())
        fmt.Printf("Hello, %s! Happy coding in Go.\\n", name)
    } else {
        fmt.Println("Hello, Gopher! Supply input in STDIN tab.")
    }
    
    nums := []int{10, 20, 30, 40}
    sum := 0
    for _, val := range nums {
        sum += val
    }
    fmt.Printf("Sum of %v is: %d\\n", nums, sum)
}
`,

    rust: `// Online Rust Compiler - CompilerG
use std::io::{self, BufRead};

fn main() {
    println!("Welcome to CompilerG Rust Compiler!");
    
    let stdin = io::stdin();
    let mut lines = stdin.lock().lines();
    
    if let Some(Ok(name)) = lines.next() {
        println!("Hello, {}! Welcome to fast & safe Rust.", name.trim());
    } else {
        println!("Hello, Rustacean! Provide input in STDIN tab.");
    }
    
    let numbers = vec![1, 2, 3, 4, 5];
    let sum: i32 = numbers.iter().sum();
    println!("Sum of numbers: {}", sum);
}
`,

    csharp: `// Online C# Compiler - CompilerG
using System;

class Program {
    static void Main() {
        Console.WriteLine("Welcome to CompilerG C# Compiler!");
        
        string name = Console.ReadLine();
        if (!string.IsNullOrEmpty(name)) {
            Console.WriteLine($"Hello, {name}! Happy coding.");
        } else {
            Console.WriteLine("Hello, Developer! Provide input in STDIN tab.");
        }
        
        int[] numbers = { 1, 3, 5, 7, 9 };
        int sum = 0;
        foreach (int num in numbers) {
            sum += num;
        }
        Console.WriteLine($"Array sum: {sum}");
    }
}
`,

    php: `<?php
// Online PHP 8.3 Runner - CompilerG
echo "Welcome to CompilerG PHP Runner!\\n";

$input = trim(fgets(STDIN));
if (!empty($input)) {
    echo "Hello, {$input}! Happy coding.\\n";
} else {
    echo "Hello, Developer! Provide input in STDIN tab.\\n";
}

$fruits = ["Apple", "Mango", "Banana", "Cherry"];
echo "Favorite fruits:\\n";
foreach ($fruits as $idx => $fruit) {
    echo ($idx + 1) . ". {$fruit}\\n";
}
?>
`,

    ruby: `# Online Ruby Compiler - CompilerG
puts "Welcome to CompilerG Ruby Runner!"

input = gets
name = input ? input.strip : "Rubyist"
puts "Hello, #{name.empty? ? 'Developer' : name}! Happy coding."

numbers = [10, 20, 30, 40]
puts "Sum of numbers #{numbers.inspect} is #{numbers.sum}"
`,

    bash: `#!/bin/bash
# Online Bash Script Runner - CompilerG
echo "Welcome to CompilerG Bash Runner!"
read -r user_input

if [ -n "$user_input" ]; then
    echo "Hello, $user_input! Script is running smoothly."
else
    echo "Hello, Linux User! Try providing input in STDIN."
fi

echo "Current Date & Time: $(date)"
echo "Listing simulated process IDs:"
for i in {1..5}; do
    echo "Task #$i completed"
done
`,

    kotlin: `// Online Kotlin Compiler - CompilerG
import java.util.Scanner

fun main() {
    println("Welcome to CompilerG Kotlin Runner!")
    
    val scanner = Scanner(System.\`in\`)
    if (scanner.hasNext()) {
        val name = scanner.next()
        println("Hello, $name! Happy Kotlin coding.")
    } else {
        println("Hello, Developer! Provide input in STDIN tab.")
    }
    
    val numbers = listOf(1, 2, 3, 4, 5)
    println("Sum of $numbers = \${numbers.sum()}")
}
`,

    swift: `// Online Swift Compiler - CompilerG
import Foundation

print("Welcome to CompilerG Swift Runner!")

if let input = readLine(), !input.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
    print("Hello, \(input)! Happy coding.")
} else {
    print("Hello, Developer! Provide input in STDIN tab.")
}

let numbers = [5, 10, 15, 20]
let total = numbers.reduce(0, +)
print("Total sum: \(total)")
`,

    sql: `-- Online SQL Compiler (SQLite 3) - CompilerG
CREATE TABLE developers (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    language TEXT NOT NULL,
    score INTEGER DEFAULT 100
);

INSERT INTO developers (name, language, score) VALUES 
('Alex Turing', 'Python', 98),
('Grace Hopper', 'C++', 100),
('Linus Torvalds', 'C', 99),
('Ada Lovelace', 'Java', 95);

SELECT name, language, score 
FROM developers 
WHERE score >= 95 
ORDER BY score DESC;
`,

    postgres: `-- Online PostgreSQL Sandbox - CompilerG
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    price NUMERIC(10, 2),
    category VARCHAR(50)
);

INSERT INTO products (title, price, category) VALUES
('Turbo IDE Pro', 49.99, 'Software'),
('Mechanical Keyboard', 129.50, 'Hardware'),
('4K Coding Monitor', 349.00, 'Hardware');

SELECT category, count(*) as count, AVG(price) as avg_price
FROM products
GROUP BY category;
`,

    mongo: `// Online MongoDB (MQL) Runner - CompilerG
// Simulated MongoDB JavaScript query collection
const db = {
    users: [
        { name: "Dev_Alice", role: "Fullstack", stars: 120 },
        { name: "Dev_Bob", role: "Backend", stars: 85 },
        { name: "Dev_Carol", role: "AI Engineer", stars: 140 }
    ]
};

console.log("=== CompilerG MongoDB Query Results ===");
const topDevs = db.users
    .filter(u => u.stars >= 100)
    .sort((a, b) => b.stars - a.stars);

console.log(JSON.stringify(topDevs, null, 2));
`
};

window.BOILERPLATES = BOILERPLATES;
