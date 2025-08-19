#!/usr/bin/env node

/**
 * MCP Nexus Voice Demo & Test Script
 * Interactive testing for hybrid voice architecture
 */

const { exec } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🎵 MCP Nexus Voice v1.2.0 - Interactive Demo');
console.log('===============================================');
console.log('');

function sendMCPCommand(command) {
  return new Promise((resolve, reject) => {
    const child = exec('node dist/index.js', { cwd: __dirname });
    
    let output = '';
    let jsonResponse = '';
    
    child.stdout.on('data', (data) => {
      const text = data.toString();
      
      // Try to parse JSON responses
      try {
        if (text.trim().startsWith('{') && text.trim().endsWith('}')) {
          jsonResponse = JSON.parse(text.trim());
        }
      } catch (e) {
        // Not JSON, collect as regular output
        output += text;
      }
    });
    
    child.stderr.on('data', (data) => {
      output += data.toString();
    });
    
    child.on('close', (code) => {
      resolve({ output, jsonResponse, code });
    });
    
    child.on('error', (error) => {
      reject(error);
    });
    
    // Send the MCP command
    child.stdin.write(JSON.stringify(command) + '\n');
    child.stdin.end();
  });
}

async function testToolsList() {
  console.log('📋 Testing tools/list...');
  const command = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/list"
  };
  
  try {
    const result = await sendMCPCommand(command);
    console.log('✅ Server Status:');
    console.log(result.output);
    
    if (result.jsonResponse && result.jsonResponse.result) {
      const tool = result.jsonResponse.result.tools[0];
      console.log('🎭 Available Parameters:');
      const props = Object.keys(tool.inputSchema.properties);
      props.forEach(prop => {
        const param = tool.inputSchema.properties[prop];
        if (param.enum) {
          console.log(`   ${prop}: ${param.enum.join(', ')}`);
        } else {
          console.log(`   ${prop}: ${param.type}`);
        }
      });
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  console.log('');
}

async function testVoiceSynthesis(text, options = {}) {
  console.log(`🎵 Testing voice synthesis: "${text}"`);
  if (Object.keys(options).length > 0) {
    console.log(`   Options: ${JSON.stringify(options)}`);
  }
  
  const command = {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: {
      name: "say",
      arguments: { text, ...options }
    }
  };
  
  try {
    const result = await sendMCPCommand(command);
    console.log(result.output);
    
    if (result.jsonResponse && result.jsonResponse.result) {
      console.log('📤 Response:', result.jsonResponse.result.content[0].text);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  console.log('');
}

async function runDemo() {
  console.log('🔍 Running comprehensive demo...\n');
  
  // Test 1: Check available tools
  await testToolsList();
  
  // Test 2: Platform TTS
  await testVoiceSynthesis('Testing platform TTS engine', { useOpenAI: false });
  
  // Test 3: OpenAI TTS (will fail with test key, but shows error handling)
  await testVoiceSynthesis('Testing OpenAI TTS engine', { 
    useOpenAI: true, 
    openaiVoice: 'nova' 
  });
  
  // Test 4: Auto-selection
  await testVoiceSynthesis('Testing auto-selection logic');
  
  // Test 5: Language-specific
  await testVoiceSynthesis('Witam! To jest test polskiego głosu.', { language: 'pl' });
  
  // Test 6: OpenAI with different settings
  await testVoiceSynthesis('Testing premium OpenAI TTS', {
    useOpenAI: true,
    openaiVoice: 'onyx',
    openaiModel: 'tts-1-hd',
    openaiSpeed: 1.2
  });
  
  console.log('🎯 Demo completed! Check the output above for results.');
  console.log('');
}

function showMenu() {
  console.log('Choose an option:');
  console.log('1. Run full demo');
  console.log('2. Test tools/list');
  console.log('3. Test platform TTS');
  console.log('4. Test OpenAI TTS');
  console.log('5. Custom test');
  console.log('6. Exit');
  console.log('');
}

async function handleCustomTest() {
  return new Promise((resolve) => {
    rl.question('Enter text to synthesize: ', (text) => {
      rl.question('Enter options (JSON, or press Enter for default): ', async (optionsStr) => {
        let options = {};
        if (optionsStr.trim()) {
          try {
            options = JSON.parse(optionsStr);
          } catch (e) {
            console.log('❌ Invalid JSON, using default options');
          }
        }
        await testVoiceSynthesis(text, options);
        resolve();
      });
    });
  });
}

function main() {
  showMenu();
  
  rl.on('line', async (input) => {
    const choice = input.trim();
    
    switch (choice) {
      case '1':
        await runDemo();
        break;
      case '2':
        await testToolsList();
        break;
      case '3':
        await testVoiceSynthesis('Testing platform TTS', { useOpenAI: false });
        break;
      case '4':
        await testVoiceSynthesis('Testing OpenAI TTS', { useOpenAI: true });
        break;
      case '5':
        await handleCustomTest();
        break;
      case '6':
        console.log('👋 Goodbye!');
        rl.close();
        return;
      default:
        console.log('❌ Invalid choice. Please select 1-6.');
    }
    
    showMenu();
  });
}

if (require.main === module) {
  main();
}
