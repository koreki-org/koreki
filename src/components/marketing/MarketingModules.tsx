import { HelpCircle, ArrowRight } from 'lucide-react';
import { Badge } from '../ui/Badge';
import Link from 'next/link';

/**
 * FeatureFAQ Component
 * ❓🏮
 * Section with frequently asked questions.
 */
export const FeatureFAQ: React.FC = () => {
    const faqs = [
        { 
            q: 'Benötigt Koreki eine Cloud-Anbindung?', 
            a: 'Nein. Koreki ist als Open-Source-Lösung auf maximale Datensouveränität ausgelegt. Über die Desktop Edition oder die Community Edition (Docker) kann das System vollständig lokal und offline (via Ollama) betrieben werden.' 
        },
        { 
            q: 'Was passiert mit den Schülerdaten?', 
            a: 'Bei lokaler Nutzung verlassen keine Daten Ihr Schulnetzwerk. Falls Sie Cloud-Schnittstellen (wie Mistral EU) anbinden, liegt die Hoheit über die Konfiguration (z.B. der Ausschluss von Modell-Training) bei Ihrer Schule. Koreki selbst erhebt keine Daten für eigene Zwecke.' 
        },
        { 
            q: 'Ist Koreki wirklich kostenlos?', 
            a: 'Ja. Koreki ist ein Open-Source-Projekt. Sowohl die Desktop-App als auch die Community Edition stehen allen Lehrkräften und Schulen kostenfrei zur Verfügung. Es gibt keine Pro-Features hinter einer Paywall.' 
        },
        { 
            q: 'Was ist der Experten-Modus?', 
            a: 'Der Experten-Modus ermöglicht es Ihnen, eigene pädagogische Profile zu erstellen. Damit passen Sie die KI-Korrektur an Ihre spezifischen Anforderungen und Fachbereiche an – von Naturwissenschaften bis Sprachen.' 
        }
    ];

    return (
        <section className="pb-12 md:pb-section-vertical px-6 md:px-page-inline bg-muted text-foreground overflow-hidden relative border-y border-border/50">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="max-w-[1200px] mx-auto relative z-10">
                <div className="text-center mb-16">
                    <Badge variant="light" className="mb-6">FAQ</Badge>
                    <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight leading-tight">Antworten auf Ihre <span className="text-primary">Fragen.</span></h2>
                    <p className="text-muted-foreground font-medium text-lg">Alles, was Sie über die Open-Source-Nutzung von Koreki wissen müssen.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-10">
                    {faqs.map((faq, i) => (
                        <div key={i} className="group">
                            <h3 className="flex items-center gap-3 text-lg font-black mb-3 group-hover:text-primary transition-colors">
                                <HelpCircle size={20} className="text-primary" />
                                {faq.q}
                            </h3>
                            <p className="text-muted-foreground font-medium leading-relaxed">{faq.a}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

/**
 * FeatureCTA Component
 * 🚀🏮
 * Final Call to Action area focusing on Community & Open Source.
 */
export const FeatureCTA: React.FC = () => {
    return (
        <section className="pb-12 md:pb-section-vertical px-6 md:px-page-inline bg-muted text-center">
            <div className="max-w-[800px] mx-auto bg-white rounded-hero p-6 md:p-card-padding shadow-2xl relative overflow-hidden border border-border">
                <div className="absolute inset-0 bg-gradient-to-br from-accent-2/5 to-accent-4/5" />
                <div className="relative z-10">
                    <h2 className="text-4xl font-black text-foreground mb-6 tracking-tight">Koreki gehört der Community.</h2>
                    <p className="text-muted-foreground font-medium text-lg mb-10 leading-relaxed">Nutzen Sie die Freiheit von Open Source kombiniert mit der Power moderner KI-Didaktik.</p>
                    <Link 
                        href="https://github.com/koreki-org/koreki"
                        target="_blank"
                        className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-10 py-5 rounded-full font-bold text-sm uppercase tracking-widest shadow-xl shadow-primary/20 transform transition-all hover:-translate-y-1"
                    >
                        GitHub Repository <ArrowRight size={20} />
                    </Link>
                </div>
            </div>
        </section>
    );
};
