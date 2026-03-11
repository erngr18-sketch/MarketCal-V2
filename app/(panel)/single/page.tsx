import { SingleAnalysis } from '@/app/components/single-analysis';

export default function SinglePage() {
  return (
    <div className="space-y-6">
      <section className="space-y-1.5">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold text-slate-900">Tek Ürün Analizi</h1>
          <p className="text-sm text-slate-600">Tek ürün senaryosunda fiyat, maliyet ve gider etkisini hızlıca değerlendirin.</p>
        </div>
      </section>

      <SingleAnalysis />
    </div>
  );
}
