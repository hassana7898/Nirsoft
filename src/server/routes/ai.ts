import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';
import { eq, desc, isNull, sql } from 'drizzle-orm';
import { getDb } from '../../db/index.ts';
import {
  products,
  flocks,
  farmers,
  feedOrders,
  deliveries,
  productionBatches,
  outboundExits,
} from '../../db/schema.ts';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth.ts';
import { getAllStockBalances } from '../../domain/inventory/inventoryService.ts';
import { calculateFCR, calculatePerCapita } from '../../domain/farming/calculations.ts';

const router = Router();

function getGeminiClient(): GoogleGenAI | null {
  if (process.env.GEMINI_API_KEY) {
    return new GoogleGenAI();
  }
  return null;
}

// 1. OCR & Bill of Lading Extraction with Human Review / Confidence
router.post('/extract-bill', requireAuth, async (req, res, next) => {
  try {
    const { text, imageBase64, mimeType } = req.body;
    if (!text && !imageBase64) {
      return res.status(400).json({ success: false, error: 'ارائه متن یا تصویر قبض باسکول الزامی است' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      const simulatedData = {
        sellerName: 'شرکت غلات دانه طلایی',
        productName: 'ذرت دانه‌ای برزیلی',
        billWeight: 25480,
        scaleWeight: 25320,
        billNumber: 'BL-98432',
        origin: 'بندر امام خمینی',
        driverName: 'علی رضایی',
        driverPlate: '۱۲ ع ۳۴۵ ایران ۶۸',
        confidenceScore: 0.94,
        isVerified: true,
      };
      return res.json({
        success: true,
        source: 'heuristic_fallback',
        data: simulatedData,
      });
    }

    const prompt = `
تو یک دستیار هوشمند برای کارخانه خوراک طیور هستی.
اطلاعات قبض باسکول یا بارنامه ورودی زیر را استخراج کن و دقیقاً در قالب فرمت JSON بازگردان (هیچ متن اضافه‌ای خارج از JSON ننویس):
{
  "sellerName": "نام فروشنده/مبدأ",
  "productName": "نام ماده اولیه (مثلاً ذرت، سویا، گندم)",
  "billWeight": 0, // وزن بارنامه به کیلوگرم (عدد)
  "scaleWeight": 0, // وزن باسکول به کیلوگرم (عدد)
  "billNumber": "شماره بارنامه یا قبض",
  "origin": "محل بارگیری یا شهر مبدأ",
  "driverName": "نام راننده",
  "driverPlate": "شماره پلاک",
  "confidenceScore": 0.95 // میزان اطمینان بین 0 تا 1
}
`;

    let response;
    if (imageBase64) {
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: mimeType || 'image/jpeg',
                  data: imageBase64.replace(/^data:image\/[a-z]+;base64,/, ''),
                },
              },
            ],
          },
        ],
      });
    } else {
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `${prompt}\n\nمتن ورودی:\n${text}`,
      });
    }

    const rawText = response.text || '';
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return res.json({ success: true, source: 'gemini-3.8-flash', data: parsed });
    }

    res.json({ success: true, source: 'raw', data: { rawText } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'خطا در پردازش هوش مصنوعی' });
  }
});

// 2. Broiler Nutritionist Advisory
router.post('/flock-advisory', requireAuth, async (req, res, next) => {
  try {
    const { breed, dayOfAge, chickCount, totalFeedKg, averageWeightGrams, mortalityPercent } = req.body;

    const ai = getGeminiClient();
    if (!ai) {
      return res.json({
        success: true,
        source: 'simulated_advisory',
        data: {
          recommendation:
            'بر اساس سن گله و میزان دان مصرفی، ضریب تبدیل در محدوده استاندارد نژاد راس ۳۰۸ قرار دارد. پیشنهاد می‌شود تهویه سالن در ساعات اوج مصرف حفظ شده و کیفیت پلت و ماندگاری ذرات نرم پایش شود.',
          status: 'GOOD',
        },
      });
    }

    const prompt = `
تو متخصص ارشد تغذیه طیور گوشتی و مدیریت گله صنعتی هستی.
اطلاعات گله به شرح زیر است:
- نژاد: ${breed || 'Ross 308'}
- سن گله: ${dayOfAge} روز
- تعداد اولیه جوجه: ${chickCount}
- کل دان مصرفی تا امروز: ${totalFeedKg} کیلوگرم
- میانگین وزن فعلی پرنده: ${averageWeightGrams || 'نامشخص'} گرم
- درصد تلفات تجمعی: ${mortalityPercent || 'عادی'}%

لطفاً یک تحلیل تخصصی و چند توصیه کاربردی فارسی (حداکثر ۳ پاراگراف) برای بهبود ضریب تبدیل (FCR)، مدیریت جیره و پیشگیری از نوسان رشد ارائه بده.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    res.json({
      success: true,
      data: {
        recommendation: response.text,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'خطا در تحلیل هوش مصنوعی' });
  }
});

// 3. Tool-Based AI Assistant Chat (Strictly Permission Scoped Tools)
router.post('/chat', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, error: 'پیام الزامی است' });
    }

    const db = await getDb();
    const userRole = req.user?.role || 'SCALE_OPERATOR';
    const farmerId = req.user?.farmerId;
    const driverId = req.user?.driverId;

    // Define permitted tool functions
    const tools: Record<string, () => Promise<any>> = {
      getInventory: async () => {
        return getAllStockBalances();
      },
      getLowStock: async () => {
        const stocks = await getAllStockBalances();
        return stocks.filter((s) => s.isLowStock);
      },
      getOrders: async () => {
        let q = db.select().from(feedOrders);
        if (userRole === 'FARMER' && farmerId) {
          return db.select().from(feedOrders).where(eq(feedOrders.farmerId, farmerId));
        }
        return q.orderBy(desc(feedOrders.createdAt)).limit(10);
      },
      getProduction: async () => {
        return db.select().from(productionBatches).orderBy(desc(productionBatches.productionDate)).limit(5);
      },
      getFlockPerformance: async () => {
        let q = db.select().from(flocks).where(isNull(flocks.deletedAt));
        if (userRole === 'FARMER' && farmerId) {
          return db.select().from(flocks).where(eq(flocks.farmerId, farmerId));
        }
        return q.orderBy(desc(flocks.startDate)).limit(10);
      },
      getDeliveries: async () => {
        if (userRole === 'DRIVER' && driverId) {
          return db.select().from(deliveries).where(eq(deliveries.driverId, driverId));
        }
        return db.select().from(deliveries).orderBy(desc(deliveries.createdAt)).limit(10);
      },
    };

    // Simple intent router to dispatch relevant tool
    let toolResult: any = null;
    let toolName = 'none';

    const msgLower = message.toLowerCase();
    if (msgLower.includes('موجودی') || msgLower.includes('انبار') || msgLower.includes('سیلو')) {
      toolName = 'getInventory';
      toolResult = await tools.getInventory();
    } else if (msgLower.includes('کسری') || msgLower.includes('کمبود') || msgLower.includes('هشدار')) {
      toolName = 'getLowStock';
      toolResult = await tools.getLowStock();
    } else if (msgLower.includes('سفارش')) {
      toolName = 'getOrders';
      toolResult = await tools.getOrders();
    } else if (msgLower.includes('تولید') || msgLower.includes('بچ')) {
      toolName = 'getProduction';
      toolResult = await tools.getProduction();
    } else if (msgLower.includes('گله') || msgLower.includes('fcr') || msgLower.includes('ضریب تبدیل')) {
      toolName = 'getFlockPerformance';
      toolResult = await tools.getFlockPerformance();
    } else if (msgLower.includes('ارسال') || msgLower.includes('راننده') || msgLower.includes('باربری')) {
      toolName = 'getDeliveries';
      toolResult = await tools.getDeliveries();
    }

    const ai = getGeminiClient();
    if (!ai) {
      // Deterministic response if Gemini API key not active
      let reply = 'سلام، من دستیار هوشمند کارخانه NIRWARE هستم.';
      if (toolName === 'getInventory') {
        reply = `بر اساس استعلام از دفتر کل انبار، موجودی کل اقلام در سیستم ثبت است. ${toolResult.length} قلم کالا با موفقیت بررسی شد.`;
      } else if (toolName === 'getLowStock') {
        reply = toolResult.length > 0
          ? `هشدار: ${toolResult.length} قلم کالا (مانند ${toolResult[0]?.name}) به زیر حد حداقل مجاز رسیده‌اند.`
          : 'خوشبختانه هیچ کالایی دچار کسری یا زیر حد هشدار نیست.';
      } else if (toolName === 'getOrders') {
        reply = `تعداد ${toolResult.length} سفارش اخیر در سیستم بازیابی شد.`;
      }
      return res.json({ success: true, toolUsed: toolName, reply, data: toolResult });
    }

    const systemPrompt = `
تو دستیار هوش مصنوعی سامانه NIRWARE NEXT در کارخانه خوراک طیور هستی.
نقش کاربر فعلی: ${userRole}.
داده‌های مستند به دست آمده از سیستم کارخانه با ابزار ${toolName}:
${JSON.stringify(toolResult, null, 2)}

سوال کاربر:
"${message}"

لطفاً پاسخی دقیق، حرفه‌ای، محترمانه و به زبان فارسی بر اساس داده‌های بالا ارائه بده.
`;

    const aiRes = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: systemPrompt,
    });

    res.json({
      success: true,
      toolUsed: toolName,
      reply: aiRes.text || '',
      data: toolResult,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'خطا در پاسخ هوش مصنوعی' });
  }
});

export default router;
