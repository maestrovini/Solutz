import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function generateMarketReport(region: string, data: any[]) {
  const model = "gemini-3.1-pro-preview";
  const prompt = `
    Analise os seguintes dados de mercado imobiliário para a região de ${region}:
    ${JSON.stringify(data, null, 2)}

    Por favor, forneça um relatório detalhado em Markdown incluindo:
    1. Tendências de preços.
    2. Tempo médio de venda e o que isso significa para o mercado local.
    3. Impacto das taxas de juros atuais.
    4. Recomendações estratégicas para corretores e imobiliárias.
    
    Use um tom profissional e analítico.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
    });
    return response.text || "Não foi possível gerar o relatório.";
  } catch (error) {
    console.error("Erro ao gerar relatório Gemini:", error);
    return "Erro na comunicação com a inteligência artificial.";
  }
}
