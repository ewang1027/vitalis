/**
 * OpenRouter Debugging Utilities
 * Use this to diagnose connection and API issues
 */

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export interface DebugReport {
  timestamp: string;
  apiKeyConfigured: boolean;
  apiKeyValid: boolean;
  networkReachable: boolean;
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
    networkReachable: false,
    simpleRequestWorks: false,
    errors: [],
    warnings: [],
    recommendations: [],
  };

  console.group('🔍 OpenRouter Diagnostics');

  // Check 1: API Key Configuration
  console.log('1️⃣ Checking API key configuration...');
  if (!OPENROUTER_API_KEY) {
    report.errors.push('VITE_OPENROUTER_API_KEY is not set in environment variables');
    report.recommendations.push('Create a .env file with VITE_OPENROUTER_API_KEY=your_key_here');
    console.error('❌ API key not configured');
  } else {
    report.apiKeyConfigured = true;
    console.log('✅ API key is configured');
    console.log(`   Key prefix: ${OPENROUTER_API_KEY.substring(0, 10)}...`);
    console.log(`   Key length: ${OPENROUTER_API_KEY.length} characters`);
  }

  // Check 2: Network Reachability
  console.log('2️⃣ Checking network reachability to OpenRouter...');
  try {
    const response = await fetch('https://openrouter.ai', {
      method: 'HEAD',
      mode: 'no-cors',
    });
    report.networkReachable = true;
    console.log('✅ OpenRouter.ai is reachable');
  } catch (error) {
    report.errors.push('Cannot reach OpenRouter.ai - network issue or firewall blocking');
    report.recommendations.push('Check your internet connection');
    report.recommendations.push('Check if firewall/proxy is blocking OpenRouter');
    console.error('❌ Network unreachable:', error);
  }

  // Check 3: Simple API Request
  if (report.apiKeyConfigured) {
    console.log('3️⃣ Testing simple API request...');
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
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'OpenRouter Diagnostics',
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
  console.log('4️⃣ Checking environment setup...');
  console.log(`   Origin: ${window.location.origin}`);
  console.log(`   Protocol: ${window.location.protocol}`);
  
  if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
    report.warnings.push('Not using HTTPS - this might cause issues with some APIs');
  }

  // Generate Summary
  console.log('\n📊 Summary:');
  console.log(`   API Key Configured: ${report.apiKeyConfigured ? '✅' : '❌'}`);
  console.log(`   API Key Valid: ${report.apiKeyValid ? '✅' : '❌'}`);
  console.log(`   Network Reachable: ${report.networkReachable ? '✅' : '❌'}`);
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
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Model Test',
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

