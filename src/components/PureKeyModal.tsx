import React from 'react';
import { X, Key, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

interface PureKeyModalProps {
    onSave: (key: string) => void;
    onClose: () => void;
}

const PureKeyModal: React.FC<PureKeyModalProps> = ({ onSave, onClose }) => {
    const [key, setKey] = React.useState('');

    return (
        <div
            className="fixed inset-0 z-[6000] flex items-center justify-center p-4 bg-background/40 backdrop-blur-glass animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-[500px] bg-white rounded-3xl p-8 shadow-glass border border-border animate-in slide-in-from-bottom-4 duration-300"
                onClick={e => e.stopPropagation()}
            >
                {/* Close Button */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="absolute h-auto top-4 right-4 p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"
                >
                    <X size={20} />
                </Button>

                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <ShieldCheck size={32} />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground mb-1">Koreki Pure Aktiv</h2>
                    <p className="text-sm text-muted-foreground">Maximale Privatsphäre: Ihre Daten verlassen nie Ihren Browser.</p>
                </div>

                <div className="bg-emerald-50/50 border border-emerald-100/50 text-emerald-900 p-4 rounded-xl text-sm leading-relaxed mb-6">
                    <p>Im <strong className="text-emerald-950">Pure-Modus</strong> kommuniziert Ihr Browser direkt mit Mistral AI. Ihr API-Key wird <strong>nur im Arbeitsspeicher (RAM)</strong> gehalten und niemals auf unseren Server übertragen oder dauerhaft gespeichert.</p>
                </div>

                <div className="space-y-4 mb-8">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-foreground ml-1">Mistral API Key eingeben</label>
                        <div className="relative group">
                            <Key size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-emerald-600 transition-colors" />
                            <Input
                                type="password"
                                placeholder="sk-..."
                                value={key}
                                onChange={(e) => setKey(e.target.value)}
                                className="pl-11 h-12 font-mono focus:border-emerald-600 focus:ring-emerald-600/10"
                            />
                        </div>
                        <p className="text-[0.75rem] text-muted-foreground ml-1">
                            Den Key finden Sie in Ihrer <a href="https://console.mistral.ai/" target="_blank" rel="noreferrer" className="text-emerald-600 hover:underline">Mistral Console</a>.
                        </p>
                    </div>

                    <div className="flex gap-3 items-center p-3 bg-amber-50 border border-amber-100 rounded-xl">
                        <AlertTriangle size={18} className="text-amber-600 shrink-0" />
                        <p className="text-[0.8rem] text-amber-900 leading-tight">
                            <strong>Hinweis:</strong> Beim Neuladen der Seite muss der Key erneut eingegeben werden.
                        </p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="flex-1"
                    >
                        Abbrechen
                    </Button>
                    <Button
                        disabled={!key}
                        onClick={() => onSave(key)}
                        className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200 border-none"
                    >
                        Sitzung starten
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default PureKeyModal;
