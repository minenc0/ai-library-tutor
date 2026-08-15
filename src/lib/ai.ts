import ZAI from 'z-ai-web-dev-sdk';

let zaiInstance: InstanceType<typeof ZAI> | null = null;

async function getZAI() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

export async function chatCompletion(messages: Array<{ role: string; content: string }>): Promise<string> {
  try {
    const zai = await getZAI();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: 'Kamu adalah asisten perpustakaan cerdas bernama AI Library Tutor. Kamu membantu pengguna memahami konten buku, menjawab pertanyaan berdasarkan konten buku yang tersedia, membuat ringkasan, dan soal-soal latihan. Jawablah dalam bahasa Indonesia dengan jelas dan terstruktur.' },
        ...messages
      ],
      thinking: { type: 'disabled' },
    });
    return completion.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('AI chat completion error:', error);
    throw new Error('Gagal terhubung ke AI. Silakan coba lagi.');
  }
}

export async function generateWithPrompt(systemPrompt: string, userPrompt: string): Promise<string> {
  try {
    const zai = await getZAI();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      thinking: { type: 'disabled' },
    });
    return completion.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('AI generation error:', error);
    throw new Error('Gagal terhubung ke AI. Silakan coba lagi.');
  }
}
