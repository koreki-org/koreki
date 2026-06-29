import React from 'react';
import { BarChart3, Target, ShieldCheck, Clock, TrendingDown, GraduationCap } from 'lucide-react';
import { BatchFile } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { useCorrectionStatistics } from '../../hooks/useCorrectionStatistics';
import { Badge } from '../ui/Badge';

interface CorrectionAnalyticsProps {
    batchFiles: BatchFile[];
}

export const CorrectionAnalytics: React.FC<CorrectionAnalyticsProps> = ({ batchFiles }) => {
    const stats = useCorrectionStatistics(batchFiles);

    if (!stats) return null;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header / Summary row inside analytics */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <Card className="p-4 border-border/50 shadow-sm bg-white/50 backdrop-blur-sm">
                    <div className="flex items-center gap-3 text-muted-foreground mb-2">
                        <GraduationCap className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider font-outfit">Ø Einschätzung</span>
                    </div>
                    <div className="text-2xl font-bold font-outfit text-primary">
                        {stats.avgGrade !== null ? stats.avgGrade.toFixed(1).replace('.', ',') : 'N/A'}
                    </div>
                </Card>

                <Card className="p-4 border-border/50 shadow-sm bg-white/50 backdrop-blur-sm">
                    <div className="flex items-center gap-3 text-muted-foreground mb-2">
                        <Target className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider font-outfit">Ø Erfüllungsgrad</span>
                    </div>
                    <div className="text-2xl font-bold font-outfit">{Math.round(stats.avgScore)}%</div>
                </Card>

                <Card className="p-4 border-border/50 shadow-sm bg-white/50 backdrop-blur-sm">
                    <div className="flex items-center gap-3 text-muted-foreground mb-2">
                        <ShieldCheck className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider font-outfit">KI-Konfidenz</span>
                    </div>
                    <div className="text-2xl font-bold font-outfit text-primary">{stats.avgConfidence ? `${Math.round(stats.avgConfidence)}%` : 'N/A'}</div>
                </Card>

                <Card className="p-4 border-border/50 shadow-sm bg-white/50 backdrop-blur-sm">
                    <div className="flex items-center gap-3 text-muted-foreground mb-2">
                        <Clock className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider font-outfit">Zeit gespart</span>
                    </div>
                    <div className="text-2xl font-bold font-outfit text-primary">~{stats.timeSavedMinutes}m</div>
                </Card>

                <Card className="p-4 border-border/50 shadow-sm bg-white/50 backdrop-blur-sm md:col-span-2 lg:col-span-1">
                    <div className="flex items-center gap-3 text-muted-foreground mb-2">
                        <TrendingDown className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider font-outfit">Themen-Fokus</span>
                    </div>
                    <div className="text-2xl font-bold font-outfit text-destructive">{stats.criticalTasks.length} Bereiche</div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Einschätzungsverteilung */}
                <Card className="border-border/50 shadow-md bg-white">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-sm font-bold flex items-center gap-2 font-outfit">
                            <BarChart3 className="w-4 h-4 text-primary" />
                            Einschätzungsverteilung
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {Object.entries(stats.distribution).sort().map(([label, count]) => (
                            <div key={label} className="group">
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="font-medium text-muted-foreground">Einschätzung {label}</span>
                                    <span className="text-muted-foreground font-semibold">{count} Schüler</span>
                                </div>
                                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-primary transition-all duration-1000 ease-out rounded-full"
                                        style={{ width: `${(count / stats.totalCount) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Kritische Aufgabengebiete */}
                <Card className="border-border/50 shadow-md bg-white">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-sm font-bold flex items-center gap-2 font-outfit">
                            <TrendingDown className="w-4 h-4 text-destructive" />
                            Kritische Aufgabengebiete
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {stats.criticalTasks.map((task, idx) => (
                            <div key={task.name} className="flex items-center gap-3 p-2 rounded-xl bg-muted/30 border border-border/40">
                                <div className="w-6 h-6 rounded-full bg-background border border-border/50 text-foreground flex items-center justify-center font-bold text-xs">
                                    {idx + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-bold font-outfit text-foreground truncate">{task.name}</div>
                                    <div className="text-xs text-muted-foreground">{Math.round(task.percentage)}% Erfolg</div>
                                </div>
                                <Badge variant={task.percentage < 40 ? 'destructive' : 'secondary'} className="text-xs px-1.5 py-0">
                                    {task.percentage < 40 ? 'Kritisch' : 'Prüfen'}
                                </Badge>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Alle Aufgaben im Überblick (Full width) */}
                <Card className="lg:col-span-2 border-border/50 shadow-md bg-white">
                    <CardHeader>
                        <CardTitle className="text-sm font-bold font-outfit">Vollständige Aufgaben-Analyse</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-4">
                        {stats.analyzedTasks.map(task => (
                            <div key={task.name} className="space-y-1.5">
                                <div className="flex justify-between items-end">
                                    <span className="text-xs font-bold text-foreground truncate mr-2 font-outfit uppercase tracking-tight" title={task.name}>{task.name}</span>
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">{task.avgPoints.toFixed(1)} / {task.maxPoints} P</span>
                                </div>
                                <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full transition-all duration-1000 ease-out rounded-full ${
                                            task.percentage > 75 ? 'bg-success' : 
                                            task.percentage > 40 ? 'bg-warning' : 'bg-destructive'
                                        }`}
                                        style={{ width: `${task.percentage}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
