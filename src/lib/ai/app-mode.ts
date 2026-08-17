import type { User } from '@/types';

/**
 * Der Betriebsmodus, wie ihn eine KI-Anfrage versteht.
 * 🎚️
 *
 * `UNSET` heisst: die Lehrkraft hat den Modus noch nicht gewaehlt. Fuer die
 * Anfrage ist das dasselbe wie "nicht angegeben" — sie laeuft dann ueber den
 * Server-Weg. `performAIRequest` kennt den Wert `UNSET` gar nicht.
 *
 * Die Uebersetzung stand als `appMode === 'UNSET' ? undefined : appMode`
 * fuenfmal im Code: viermal in app.tsx, einmal in der Verarbeitungs-Pipeline.
 */
export type AnfrageModus = 'PURE' | 'STANDARD' | 'TRIAL' | undefined;

export const alsAnfrageModus = (modus?: User['appMode']): AnfrageModus =>
    modus === 'UNSET' ? undefined : modus;
