export interface LanguageConfig {
  id: string;
  name: string;
  monacoLanguage: string;
  pistonLanguage: string;
  judge0Id: number;
  version: string;
  fileName: string;
  defaultCode: string;
}

/**
 * Extensible language configurations.
 * To add a new language, simply add a new entry to this array.
 */
export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  {
    id: 'python',
    name: 'Python',
    monacoLanguage: 'python',
    pistonLanguage: 'python',
    judge0Id: 100,
    version: '3.10.0',
    fileName: 'main.py',
    defaultCode: `import random
import string

def generate_password(length):
    chars = string.ascii_letters + string.digits + "!@#$%^&*"
    return "".join(random.choice(chars) for _ in range(length))

def check_strength(password):
    if len(password) >= 12:
        return "Strong"
    elif len(password) >= 8:
        return "Moderate"
    return "Weak"

while True:
    print("\\n--- PASSWORD GENERATOR ---")
    print("1. Generate password")
    print("2. Check password strength")
    print("3. Exit")
    choice = input("Choose an option: ")

    if choice == "1":
        try:
            length = int(input("Enter password length: "))
            password = generate_password(length)
            print("Generated password:", password)
            print("Strength:", check_strength(password))
        except ValueError as error:
            print("Error:", error)

    elif choice == "2":
        password = input("Enter your password: ")
        print("Strength:", check_strength(password))

    elif choice == "3":
        print("Program closed.")
        break

    else:
        print("Invalid option. Try again.")
`
  },
  {
    id: 'javascript',
    name: 'JavaScript',
    monacoLanguage: 'javascript',
    pistonLanguage: 'javascript',
    judge0Id: 102,
    version: '18.15.0',
    fileName: 'index.js',
    defaultCode: `// JavaScript Starter
function main() {
    console.log("Hello, World from JavaScript!");
    const items = [1, 2, 3, 4, 5];
    const sum = items.reduce((acc, curr) => acc + curr, 0);
    console.log("Calculated sum:", sum);
}

main();
`
  },
  {
    id: 'c',
    name: 'C',
    monacoLanguage: 'c',
    pistonLanguage: 'c',
    judge0Id: 50,
    version: '10.2.0',
    fileName: 'main.c',
    defaultCode: `// C Starter
#include <stdio.h>

int main() {
    printf("Hello, World from C!\\n");
    return 0;
}
`
  },
  {
    id: 'cpp',
    name: 'C++',
    monacoLanguage: 'cpp',
    pistonLanguage: 'c++',
    judge0Id: 54,
    version: '10.2.0',
    fileName: 'main.cpp',
    defaultCode: `// C++ Starter
#include <iostream>
#include <vector>

int main() {
    std::cout << "Hello, World from C++!" << std::endl;
    std::vector<int> numbers = {10, 20, 30};
    for (int n : numbers) {
        std::cout << "Element: " << n << std::endl;
    }
    return 0;
}
`
  },
  {
    id: 'java',
    name: 'Java',
    monacoLanguage: 'java',
    pistonLanguage: 'java',
    judge0Id: 91,
    version: '15.0.2',
    fileName: 'Main.java',
    defaultCode: `// Java Starter
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World from Java!");
    }
}
`
  },
  {
    id: 'html',
    name: 'HTML5',
    monacoLanguage: 'html',
    pistonLanguage: 'html',
    judge0Id: 0,
    version: '5.0',
    fileName: 'index.html',
    defaultCode: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CloudCompiler Web Sandbox</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: linear-gradient(135deg, #090d16, #111827);
      color: #f1f5f9;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 85vh;
      margin: 0;
      padding: 1.5rem;
    }
    .card {
      background: rgba(30, 41, 59, 0.7);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 2rem;
      max-width: 440px;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
    }
    h2 {
      margin-top: 0;
      color: #38bdf8;
      font-size: 1.5rem;
    }
    p {
      color: #94a3b8;
      line-height: 1.6;
      font-size: 0.95rem;
    }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
      font-size: 0.75rem;
      font-weight: 600;
      margin-bottom: 1rem;
    }
    button {
      background: linear-gradient(135deg, #38bdf8, #818cf8);
      color: #030712;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-weight: 700;
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 4px 15px rgba(56, 189, 248, 0.3);
    }
    button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(56, 189, 248, 0.5);
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Live Web Sandbox</div>
    <h2>🚀 Welcome to HTML5 & CSS3</h2>
    <p>Build, test, and render modern web pages instantly with interactive live preview.</p>
    <button onclick="alert('Hello from interactive HTML5 sandbox!')">Click to Test</button>
  </div>
</body>
</html>
`
  },
  {
    id: 'css',
    name: 'CSS3',
    monacoLanguage: 'css',
    pistonLanguage: 'css',
    judge0Id: 0,
    version: '3.0',
    fileName: 'styles.css',
    defaultCode: `/* CSS3 Stylesheet */
:root {
  --primary-accent: #38bdf8;
  --secondary-accent: #a855f7;
  --bg-gradient: linear-gradient(135deg, #0f172a, #1e1b4b);
}

body {
  margin: 0;
  padding: 2rem;
  background: var(--bg-gradient);
  font-family: system-ui, sans-serif;
  color: #f8fafc;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
}

.showcase-box {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(12px);
  border-radius: 20px;
  padding: 40px;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  animation: pulse-glow 3s infinite ease-in-out;
}

@keyframes pulse-glow {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 8px 32px rgba(56, 189, 248, 0.2);
  }
  50% {
    transform: scale(1.02);
    box-shadow: 0 12px 40px rgba(168, 85, 247, 0.35);
  }
}
`
  }
];

export const LANGUAGE_MAP = new Map<string, LanguageConfig>(
  SUPPORTED_LANGUAGES.map((lang) => [lang.id, lang])
);

export function getLanguageById(id: string): LanguageConfig | undefined {
  return LANGUAGE_MAP.get(id.toLowerCase());
}

export function isLanguageSupported(id: string): boolean {
  return LANGUAGE_MAP.has(id.toLowerCase());
}
