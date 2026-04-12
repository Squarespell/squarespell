import PDFDocument from 'pdfkit';

interface Lead {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

interface Quiz {
  id: string;
  title: string;
  mode: string;
  questions: Array<{
    id: string;
    text: string;
  }>;
  outcomes: Array<{
    id: string;
    title: string;
    description: string;
  }>;
  branding?: {
    primaryColor?: string;
    siteName?: string;
    logoUrl?: string;
    showBranding?: boolean;
  };
  settings?: {
    show_branding?: boolean;
  };
}

interface PriceCalculatorOutcome {
  items: Array<{
    label: string;
    price: number;
  }>;
  total: number;
}

interface ServiceRecommenderOutcome {
  package_name: string;
  features: string[];
  price?: number;
}

interface ClientQualifierOutcome {
  qualified: boolean;
  next_steps: string[];
}

interface SegmentationOutcome {
  segment_name: string;
  description: string;
}

type OutcomeData =
  | PriceCalculatorOutcome
  | ServiceRecommenderOutcome
  | ClientQualifierOutcome
  | SegmentationOutcome
  | null;

interface Outcome {
  id: string;
  title: string;
  description: string;
  data?: OutcomeData;
}

export async function generateQuizReport(
  lead: Lead,
  quiz: Quiz,
  outcome: Outcome,
  answers: Record<string, string> = {},
  reportSettings?: {
    enabled?: boolean;
    include_answers?: boolean;
    custom_footer_text?: string;
  }
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      doc.on('error', reject);

      const primaryColor = quiz.branding?.primaryColor || '#D2FF1D';
      const siteName = quiz.branding?.siteName || 'Squarespell Quiz';
      const showBranding = quiz.settings?.show_branding !== false && quiz.branding?.showBranding !== false;

      // Helper to convert hex to RGB
      function hexToRgb(hex: string): string {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (result) {
          const r = parseInt(result[1], 16);
          const g = parseInt(result[2], 16);
          const b = parseInt(result[3], 16);
          return `rgb(${r},${g},${b})`;
        }
        return 'rgb(210, 255, 29)';
      }

      const accentRGB = hexToRgb(primaryColor);

      // ─── Header with Logo/Branding ───
      if (showBranding && quiz.branding?.logoUrl) {
        try {
          doc.image(quiz.branding.logoUrl, 40, 40, { width: 80 });
          doc.moveDown(2.5);
        } catch (e) {
          console.log('[PDF] Could not load logo, continuing');
          doc.moveDown(1);
        }
      }

      // Quiz Title
      doc.fontSize(28).font('Helvetica-Bold').fillColor(accentRGB).text(quiz.title, { align: 'left' });
      doc.moveDown(0.5);

      // Lead Info Line
      doc.fontSize(11).fillColor('#666666').font('Helvetica').text(
        `Report for ${lead.name} | ${new Date(lead.created_at).toLocaleDateString()}`,
        { align: 'left' }
      );
      doc.moveDown(1.5);

      // ─── Outcome Box ───
      const boxY = doc.y;
      doc.rect(40, boxY, 515, 100).fillAndStroke(accentRGB, accentRGB);
      doc.fontSize(20).fillColor('#0a0f05').font('Helvetica-Bold').text(
        outcome.title,
        55,
        boxY + 15,
        { width: 485, align: 'left' }
      );
      doc.fontSize(13).fillColor('#0a0f05').font('Helvetica').text(
        outcome.description,
        55,
        boxY + 45,
        { width: 485, align: 'left' }
      );
      doc.moveDown(5.5);

      // ─── Mode-Specific Content ───

      if (quiz.mode === 'price_calculator' && outcome.data) {
        const calcOutcome = outcome.data as PriceCalculatorOutcome;
        doc.fontSize(14).fillColor('#1a1a1a').font('Helvetica-Bold').text('Pricing Breakdown', { align: 'left' });
        doc.moveDown(0.8);

        if (calcOutcome.items && Array.isArray(calcOutcome.items)) {
          calcOutcome.items.forEach((item) => {
            doc.fontSize(11).fillColor('#333333').font('Helvetica').text(
              `${item.label}: $${item.price?.toFixed(2) || '0.00'}`,
              { align: 'left' }
            );
          });
        }

        doc.moveDown(0.8);
        doc.strokeColor('#CCCCCC').lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
        doc.moveDown(0.5);

        doc.fontSize(14).fillColor('#1a1a1a').font('Helvetica-Bold').text(
          `Total: $${(calcOutcome.total || 0).toFixed(2)}`,
          { align: 'left' }
        );
        doc.moveDown(1.5);
      }

      if (quiz.mode === 'service_recommender' && outcome.data) {
        const svcOutcome = outcome.data as ServiceRecommenderOutcome;
        doc.fontSize(14).fillColor('#1a1a1a').font('Helvetica-Bold').text('Recommended Package', { align: 'left' });
        doc.moveDown(0.8);

        doc.fontSize(12).fillColor('#333333').font('Helvetica-Bold').text(svcOutcome.package_name || 'Package', {
          align: 'left',
        });

        if (svcOutcome.features && Array.isArray(svcOutcome.features)) {
          doc.moveDown(0.3);
          svcOutcome.features.forEach((feature) => {
            doc.fontSize(11).fillColor('#555555').font('Helvetica').text(`• ${feature}`, { align: 'left' });
          });
        }

        if (svcOutcome.price) {
          doc.moveDown(0.8);
          doc.fontSize(12).fillColor('#1a1a1a').font('Helvetica-Bold').text(
            `Price: $${svcOutcome.price.toFixed(2)}`,
            { align: 'left' }
          );
        }

        doc.moveDown(1.5);
      }

      if (quiz.mode === 'client_qualifier' && outcome.data) {
        const qualOutcome = outcome.data as ClientQualifierOutcome;
        doc.fontSize(14).fillColor('#1a1a1a').font('Helvetica-Bold').text('Qualification Status', { align: 'left' });
        doc.moveDown(0.8);

        const status = qualOutcome.qualified ? 'QUALIFIED' : 'NOT QUALIFIED';
        const statusColor = qualOutcome.qualified ? '#22c55e' : '#ef4444';
        doc.fontSize(13).fillColor(statusColor).font('Helvetica-Bold').text(status, { align: 'left' });
        doc.moveDown(0.8);

        if (qualOutcome.next_steps && Array.isArray(qualOutcome.next_steps)) {
          doc.fontSize(11).fillColor('#666666').font('Helvetica').text('Next Steps:', { align: 'left' });
          doc.moveDown(0.3);
          qualOutcome.next_steps.forEach((step) => {
            doc.fontSize(11).fillColor('#555555').font('Helvetica').text(`• ${step}`, { align: 'left' });
          });
        }

        doc.moveDown(1.5);
      }

      if (quiz.mode === 'segmentation_quiz' && outcome.data) {
        const segOutcome = outcome.data as SegmentationOutcome;
        doc.fontSize(14).fillColor('#1a1a1a').font('Helvetica-Bold').text('Your Segment', { align: 'left' });
        doc.moveDown(0.8);

        doc.fontSize(12).fillColor('#333333').font('Helvetica-Bold').text(segOutcome.segment_name || 'Segment', {
          align: 'left',
        });
        doc.moveDown(0.3);

        doc.fontSize(11).fillColor('#555555').font('Helvetica').text(segOutcome.description || '', { align: 'left' });
        doc.moveDown(1.5);
      }

      // ─── Answer Summary (if enabled) ───
      if (reportSettings?.include_answers && Object.keys(answers).length > 0) {
        doc.fontSize(14).fillColor('#1a1a1a').font('Helvetica-Bold').text('Your Answers', { align: 'left' });
        doc.moveDown(0.8);

        quiz.questions.forEach((question, idx) => {
          const answer = answers[question.id];
          if (answer) {
            doc.fontSize(11).fillColor('#333333').font('Helvetica-Bold').text(`Q${idx + 1}. ${question.text}`, {
              align: 'left',
              width: 495,
            });
            doc.moveDown(0.3);

            doc.fontSize(10).fillColor('#555555').font('Helvetica').text(`Answer: ${answer}`, {
              align: 'left',
              width: 495,
            });
            doc.moveDown(0.6);
          }
        });
      }

      // ─── Footer ───
      doc.moveDown(1);
      doc.fontSize(9).fillColor('#999999').font('Helvetica').text(
        reportSettings?.custom_footer_text || 'Generated by Squarespell',
        { align: 'center' }
      );

      if (showBranding) {
        doc.moveDown(0.3);
        doc.fontSize(8).fillColor('#CCCCCC').font('Helvetica').text('Powered by Squarespell', { align: 'center' });
      }

      doc.end();
    } catch (err: any) {
      reject(err);
    }
  });
}
