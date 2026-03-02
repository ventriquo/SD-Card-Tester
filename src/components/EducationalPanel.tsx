import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HelpCircle, X, BookOpen, AlertTriangle, Gauge, Search } from 'lucide-react';
import { t } from '../i18n';
import { useLanguage } from '../i18n/LanguageContext';

interface TooltipItem {
  id: string;
  icon: React.ReactNode;
  title: string;
  content: string;
}

export function EducationalPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const { language } = useLanguage();

  const tooltips: TooltipItem[] = [
    {
      id: 'why-test',
      icon: <BookOpen className="w-5 h-5" />,
      title: t('whyTestSDCard', language),
      content: t('whyTestSDCardContent', language),
    },
    {
      id: 'what-is-fake',
      icon: <AlertTriangle className="w-5 h-5" />,
      title: t('whatIsFakeCard', language),
      content: t('whatIsFakeCardContent', language),
    },
    {
      id: 'how-to-spot',
      icon: <Search className="w-5 h-5" />,
      title: t('howToSpotFake', language),
      content: t('howToSpotFakeContent', language),
    },
    {
      id: 'speed-classes',
      icon: <Gauge className="w-5 h-5" />,
      title: t('speedClasses', language),
      content: t('speedClassesContent', language),
    },
  ];

  return (
    <>
      {/* Floating Help Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-[var(--color-primary)] text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center justify-center group"
        title="Learn about SD cards"
      >
        <HelpCircle className="w-6 h-6 group-hover:rotate-12 transition-transform" />
      </button>

      {/* Educational Panel Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 border-b border-[var(--color-border)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-[var(--color-primary)]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[var(--color-text)]">
                      {language === 'id' ? 'Pusat Edukasi' : 'Education Center'}
                    </h2>
                    <p className="text-sm text-[var(--color-text-muted)]">
                      {language === 'id' 
                        ? 'Pelajari tentang kartu SD dan cara mendeteksi yang palsu'
                        : 'Learn about SD cards and how to detect fakes'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-[var(--color-surface-hover)] rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-[var(--color-text-muted)]" />
                </button>
              </div>

              {/* Content */}
              <div className="overflow-y-auto max-h-[60vh] p-6">
                <div className="space-y-4">
                  {tooltips.map((item) => (
                    <div
                      key={item.id}
                      className={`rounded-xl border transition-all duration-300 ${
                        activeTooltip === item.id
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                          : 'border-[var(--color-border)] bg-[var(--color-surface-hover)] hover:border-[var(--color-text-muted)]'
                      }`}
                    >
                      <button
                        onClick={() => setActiveTooltip(activeTooltip === item.id ? null : item.id)}
                        className="w-full flex items-center gap-3 p-4 text-left"
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                          activeTooltip === item.id
                            ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]'
                            : 'bg-[var(--color-bg)] text-[var(--color-text-muted)]'
                        }`}>
                          {item.icon}
                        </div>
                        <span className="flex-1 font-semibold text-[var(--color-text)]">
                          {item.title}
                        </span>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          activeTooltip === item.id
                            ? 'border-[var(--color-primary)] rotate-180'
                            : 'border-[var(--color-text-muted)]'
                        }`}>
                          <div className="w-2 h-2 border-l-2 border-b-2 border-current transform -rotate-45 -mt-0.5" />
                        </div>
                      </button>
                      
                      <AnimatePresence>
                        {activeTooltip === item.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4">
                              <div className="pl-13 pl-[3.25rem]">
                                <p className="text-[var(--color-text-muted)] whitespace-pre-line leading-relaxed">
                                  {item.content}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>

                {/* Quick Tips Section */}
                <div className="mt-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-amber-400 mb-2">
                        {language === 'id' ? 'Tips Cepat' : 'Quick Tips'}
                      </h3>
                      <ul className="text-sm text-[var(--color-text-muted)] space-y-1 list-disc list-inside">
                        {language === 'id' ? (
                          <>
                            <li>Selalu uji kartu SD baru sebelum menggunakannya</li>
                            <li>Beli dari penjual terpercaya dengan garansi</li>
                            <li>Waspadai harga yang terlalu murah</li>
                            <li>Periksa kecepatan tulis dengan pengujian</li>
                            <li>Simpan struk pembelian untuk garansi</li>
                          </>
                        ) : (
                          <>
                            <li>Always test new SD cards before using them</li>
                            <li>Buy from trusted sellers with warranty</li>
                            <li>Be wary of prices that seem too cheap</li>
                            <li>Check write speeds with testing</li>
                            <li>Keep purchase receipts for warranty</li>
                          </>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-surface-hover)]/50">
                <p className="text-xs text-center text-[var(--color-text-muted)]">
                  {language === 'id'
                    ? 'Informasi lebih lanjut tersedia di dokumentasi pengguna'
                    : 'More information available in the user documentation'}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default EducationalPanel;
