/**
 * OpenRouter Debugging Utilities
 * Use this to diagnose connection and API issues. Requests go through the
 * server's /api/llm proxy, which holds the API key.
 */

import { SERVER_URL } from '@/lib/server';
import { LLM_PROXY_URL } from '@/lib/openrouter';

const OPENROUTER_API_URL = LLM_PROXY_URL;

export interface DebugReport {
  timestamp: string;
  apiKeyConfigured: boolean;
  apiKeyValid: boolean;
  serverReachable: boolean;
  simpleRequestWorks: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

/**
 * Run comprehensive diagnostics on OpenRouter connection
 */
export async function runOpenRouterDiagnostics(): Promise<DebugReport> {
  const report: DebugReport = {
    timestamp: new Date().toISOString(),
    apiKeyConfigured: false,
    apiKeyValid: false,
    serverReachable: false,
    simpleRequestWorks: false,
    errors: [],
    warnings: [],
    recommendations: [],
  };

  console.group('🔍 OpenRouter Diagnostics');

  // Check 1: Server reachable, and whether it has an API key
  console.log(`1️⃣ Checking the server at ${SERVER_URL}...`);
  try {
    const response = await fetch(`${SERVER_URL}/api/health`);
    const health = await response.json();
    report.serverReachable = true;
    console.log('✅ Server is reachable');
    if (health.llmConfigured) {
      report.apiKeyConfigured = true;
      console.log('✅ Server has an OpenRouter API key');
    } else {
      report.errors.push('OPENROUTER_API_KEY is not set on the server');
      report.recommendations.push('Add OPENROUTER_API_KEY=your_key_here to .env and restart the server');
      console.error('❌ API key not configured on the server');
    }
  } catch (error) {
    report.errors.push(`Cannot reach the server at ${SERVER_URL}`);
    report.recommendations.push('Start it with npm run dev, or set VITE_SERVER_URL to where it runs');
    console.error('❌ Server unreachable:', error);
  }

  // Check 3: Simple API Request
  if (report.apiKeyConfigured) {
    console.log('2️⃣ Testing simple API request through the server...');
    try {
      const testMessage = {
        model: 'anthropic/claude-3-haiku',
        messages: [
          { role: 'user', content: 'Say "test successful" and nothing else.' },
        ],
        max_tokens: 10,
      };

      console.log('   Sending test request...');
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testMessage),
      });

      console.log(`   Response status: ${response.status} ${response.statusText}`);

      if (response.ok) {
        const data = await response.json();
        report.simpleRequestWorks = true;
        report.apiKeyValid = true;
        console.log('✅ Simple API request successful');
        console.log(`   Response: ${data.choices?.[0]?.message?.content}`);
      } else if (response.status === 401 || response.status === 403) {
        report.errors.push('API key is invalid or unauthorized');
        report.recommendations.push('Verify your API key at https://openrouter.ai/keys');
        report.recommendations.push('Check if you have credits in your OpenRouter account');
        console.error('❌ Authentication failed');

        const errorText = await response.text();
        console.error(`   Error response: ${errorText}`);
      } else if (response.status === 500) {
        report.errors.push('OpenRouter returned 500 Internal Server Error');
        report.warnings.push('This is a server-side issue with OpenRouter, not your code');
        report.recommendations.push('Check OpenRouter status: https://status.openrouter.ai/');
        report.recommendations.push('Try again in a few minutes');
        report.recommendations.push('Try a different model');

        const errorText = await response.text();
        console.error('❌ Server error (500)');
        console.error(`   Error response: ${errorText}`);

        // API key is likely valid if we got past auth
        report.apiKeyValid = true;
      } else {
        report.errors.push(`API request failed with status ${response.status}`);
        console.error(`❌ Request failed: ${response.status}`);

        const errorText = await response.text();
        console.error(`   Error response: ${errorText}`);
      }
    } catch (error) {
      report.errors.push(`Failed to send test request: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('❌ Request failed:', error);
    }
  }

  // Check 4: Environment Setup
  console.log('3️⃣ Checking environment setup...');
  console.log(`   Origin: ${window.location.origin}`);
  console.log(`   Protocol: ${window.location.protocol}`);
  
  if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
    report.warnings.push('Not using HTTPS - this might cause issues with some APIs');
  }

  // Generate Summary
  console.log('\n📊 Summary:');
  console.log(`   API Key Configured: ${report.apiKeyConfigured ? '✅' : '❌'}`);
  console.log(`   API Key Valid: ${report.apiKeyValid ? '✅' : '❌'}`);
  console.log(`   Server Reachable: ${report.serverReachable ? '✅' : '❌'}`);
  console.log(`   Simple Request Works: ${report.simpleRequestWorks ? '✅' : '❌'}`);

  if (report.errors.length > 0) {
    console.log('\n❌ Errors:');
    report.errors.forEach((error, i) => console.log(`   ${i + 1}. ${error}`));
  }

  if (report.warnings.length > 0) {
    console.log('\n⚠️ Warnings:');
    report.warnings.forEach((warning, i) => console.log(`   ${i + 1}. ${warning}`));
  }

  if (report.recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    report.recommendations.forEach((rec, i) => console.log(`   ${i + 1}. ${rec}`));
  }

  console.groupEnd();

  return report;
}

/**
 * Test OpenRouter with different models
 */
export async function testOpenRouterModels(): Promise<Record<string, any>> {
  console.group('🧪 Testing OpenRouter Models');

  const models = [
    'anthropic/claude-3.5-sonnet',
    'anthropic/claude-3-sonnet',
    'anthropic/claude-3-haiku',
  ];

  const results: Record<string, any> = {};

  for (const model of models) {
    console.log(`\nTesting model: ${model}`);
    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 5,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        results[model] = {
          status: 'success',
          response: data.choices?.[0]?.message?.content,
        };
        console.log(`✅ ${model} works`);
      } else {
        results[model] = {
          status: 'failed',
          statusCode: response.status,
          error: await response.text(),
        };
        console.error(`❌ ${model} failed with ${response.status}`);
      }
    } catch (error) {
      results[model] = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      console.error(`❌ ${model} error:`, error);
    }

    // Wait 1 second between requests to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.groupEnd();
  return results;
}

/**
 * Export diagnostic function to window for easy access from console
 */
if (typeof window !== 'undefined') {
  (window as any).debugOpenRouter = runOpenRouterDiagnostics;
  (window as any).testOpenRouterModels = testOpenRouterModels;
  console.log('💡 Debug utilities available:');
  console.log('   - window.debugOpenRouter() - Run full diagnostics');
  console.log('   - window.testOpenRouterModels() - Test different models');
}

