import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { seedTemplates as templates } from '../data/seedTemplates';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runSeed() {
  try {
    console.log(`Starting to seed ${templates.length} templates...`);

    const { count, error: countError } = await supabase
      .from('templates')
      .select('id', { count: 'exact', head: true });

    if (countError) throw countError;

    if ((count ?? 0) > 0) {
      console.log(`Templates table already has ${count} templates. Skipping seed.`);
      process.exit(0);
    }

    for (const template of templates) {
      const { error } = await supabase.from('templates').insert({
        title: template.title,
        description: template.description,
        mode: template.mode,
        category: template.category,
        quiz_data: template.quiz_data,
        thumbnail_url: (template as any).thumbnail_url || null,
        popularity: 0,
      });

      if (error) {
        console.error(`Failed to insert template "${template.title}":`, error);
        throw error;
      }

      console.log(`Seeded template: ${template.title}`);
    }

    console.log(`\nSuccessfully seeded ${templates.length} templates!`);
    process.exit(0);
  } catch (err: any) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

runSeed();
