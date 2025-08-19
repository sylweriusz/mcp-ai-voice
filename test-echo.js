#!/usr/bin/env node

// Load environment variables
require('dotenv').config();

const { VoiceEngineSelector } = require('./dist/voice-engine-selector.js');

async function testEcho() {
  console.log('🔧 OpenAI API Key:', process.env.OPENAI_API_KEY ? 'Found' : 'Not found');
  console.log('🔧 Initializing voice selector...');
  
  const selector = new VoiceEngineSelector();
  await selector.initialize();
  
  console.log('🔧 Testing echo with options...');
  
  const options = {
    echo: true,
    useOpenAI: true
  };
  
  console.log('🔧 Options:', options);
  
  try {
    const result = await selector.synthesizeVoice("Echo test from JavaScript", options);
    console.log('🔧 Result:', result);
  } catch (error) {
    console.error('🔧 Error:', error);
  }
}

testEcho();
