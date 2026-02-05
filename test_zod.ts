import { z } from 'zod';
const schema = z.object({ name: z.string() });
try {
  console.log('Has toJSONSchema:', typeof (schema as any).toJSONSchema === 'function');
  console.log('Result:', JSON.stringify((schema as any).toJSONSchema()));
} catch (e) {
  console.log('Error calling toJSONSchema:', e.message);
}
