  /**
   * 打字练习背单词 - 主页面组件
   *
   * 功能：
   * - 通过打字练习记忆单词
   * - 实时统计 WPM 和准确率
   * - 支持默写模式和练习模式
   * - 自动发音和音效反馈
   *
   * 数据源：
   * - 当前：从 data/words.json 加载测试数据
   * - 未来：可切换到主项目 API（修改 data-loader.ts 中的 DATA_SOURCE 配置）
   */

  "use client";

  import React, { useState, useEffect, useCallback, useRef } from 'react';
  import { motion, AnimatePresence } from 'framer-motion';
  import { Volume2, Eye, EyeOff, RotateCcw, Settings, Keyboard, Music, Music2 } from 'lucide-react';

  // ==================== 类型和数据加载 ====================

  import {
    Word,
    Dict,
    AppState,
    SoundType,
  } from './types'

  import {
    loadDict,
    getAvailableDicts,
    groupWordsByCategory,
    getCategories,
  } from './data-loader'

  // ==================== 动画变体 ====================

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 24,
      },
    },
  };

  const shakeVariants = {
    shake: {
      x: [0, -10, 10, -10, 10, -5, 5, 0],
      transition: {
        duration: 0.5,
      },
    },
  };

  const popVariants = {
    pop: {
      scale: [1, 1.2, 1],
      transition: {
        duration: 0.2,
      },
    },
  };

  // ==================== 子组件 ====================

  // Toggle 开关组件
  const ToggleSwitch = ({ isActive, onToggle, label }: { isActive: boolean; onToggle: () => void; label: string }) => (
    <button
      onClick={onToggle}
      className={`w-14 h-7 rounded-full transition-colors duration-300 relative ${
        isActive ? 'bg-primary' : 'bg-gray-300'
      }`}
      aria-pressed={isActive}
      aria-label={label}
    >
      <motion.div
        className="w-5 h-5 bg-white rounded-full shadow-md absolute top-1"
        animate={{ left: isActive ? 24 : 4 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </button>
  );

  // 图标按钮组件
  const IconButton = ({
    icon: Icon,
    isActive,
    onClick,
    label,
  }: {
    icon: React.ElementType;
    isActive: boolean;
    onClick: () => void;
    label: string;
  }) => (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`p-2 rounded-lg transition-colors ${
        isActive ? 'bg-primary-light text-primary' : 'bg-gray-100 text-gray-400'
      }`}
      title={label}
    >
      <Icon size={18} />
    </motion.button>
  );

  // ==================== 主组件 ====================

  export default function PracticePage() {
    // 数据加载状态
    const [isLoading, setIsLoading] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [availableDicts, setAvailableDicts] = useState<Dict[]>([])

    // 状态管理
    const [state, setState] = useState<AppState>({
      currentDict: '',
      currentIndex: 0,
      userInput: '',
      isBlindMode: true,
      showTranslation: true,
      soundEnabled: true,
      keyboardSound: 'mech',
      pronunciationEnabled: true,
      isPlayingPronunciation: false,
      shakeTrigger: 0,
      correctKeystrokes: 0,
      totalKeystrokes: 0,
      startTime: null,
    });

  
    // 音频引用
    const mechSoundRef = useRef<HTMLAudioElement | null>(null);
    const softSoundRef = useRef<HTMLAudioElement | null>(null);
    const pronunciationRef = useRef<HTMLAudioElement | null>(null);
    const errorSoundUrl = useRef('https://www.myinstants.com/media/sounds/discord-notification.mp3');

    // ==================== 数据加载 ====================

    useEffect(() => {
      async function loadData() {
        try {
          setIsLoading(true)
          const dicts = await getAvailableDicts()
          setAvailableDicts(dicts)

          if (dicts.length > 0) {
            const firstDict = dicts[0]
            setState(prev => ({
              ...prev,
              currentDict: firstDict.id,
            }))
          }

          setIsLoading(false)
        } catch (error) {
          console.error('Failed to load data:', error)
          setLoadError('加载词库失败，请刷新页面重试')
          setIsLoading(false)
        }
      }

      loadData()
    }, [])

    // 初始化音效
    useEffect(() => {
      mechSoundRef.current = new Audio('/sounds/mech.mp3');
      softSoundRef.current = new Audio('/sounds/soft.mp3');
      mechSoundRef.current.load();
      softSoundRef.current.load();

      return () => {
        mechSoundRef.current = null;
        softSoundRef.current = null;
        pronunciationRef.current = null;
      };
    }, []);

    // 当前单词数据
    const currentDict = availableDicts.find(d => d.id === state.currentDict) || availableDicts[0]
    const currentWord = currentDict?.words[state.currentIndex]?.word || ''
    const currentTrans = currentDict?.words[state.currentIndex]?.trans || ''

    // ==================== 计算统计数据 ====================

    const getElapsedTime = useCallback(() => {
      if (!state.startTime) return 0;
      return Math.floor((Date.now() - state.startTime) / 1000);
    }, [state.startTime]);

    const calculateWPM = useCallback(() => {
      if (!state.startTime || state.correctKeystrokes === 0) return 0;
      const minutes = (Date.now() - state.startTime) / 60000;
      return Math.round((state.correctKeystrokes / 5) / minutes) || 0;
    }, [state.startTime, state.correctKeystrokes]);

    const calculateAccuracy = useCallback(() => {
      if (state.totalKeystrokes === 0) return 100;
      return Math.round((state.correctKeystrokes / state.totalKeystrokes) * 100);
    }, [state.correctKeystrokes, state.totalKeystrokes]);

    // ==================== 音频函数 ====================

    const fallbackSpeak = useCallback((text: string) => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;

        utterance.onstart = () => setState(prev => ({ ...prev, isPlayingPronunciation: true }));
        utterance.onend = () => setState(prev => ({ ...prev, isPlayingPronunciation: false }));

        window.speechSynthesis.speak(utterance);
      }
    }, []);

    const playPronunciation = useCallback(() => {
      const word = currentWord.toLowerCase();
      const url = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=1`;

      if (pronunciationRef.current) {
        pronunciationRef.current.pause();
      }

      const audio = new Audio(url);
      pronunciationRef.current = audio;

      audio.onended = () => setState(prev => ({ ...prev, isPlayingPronunciation: false }));

      audio.onerror = () => {
        fallbackSpeak(currentWord);
      };

      setState(prev => ({ ...prev, isPlayingPronunciation: true }));

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          fallbackSpeak(currentWord);
        });
      }
    }, [currentWord, fallbackSpeak]);

    const playTypingSound = useCallback((isCorrect: boolean) => {
      if (!state.soundEnabled) return;

      if (isCorrect && state.keyboardSound !== 'none') {
        const sound = state.keyboardSound === 'mech' ? mechSoundRef.current : softSoundRef.current;
        if (sound) {
          sound.currentTime = 0;
          sound.play().catch(() => {});
        }
      } else if (!isCorrect) {
        const errorSound = new Audio(errorSoundUrl.current);
        errorSound.play().catch(() => {});
      }
    }, [state.soundEnabled, state.keyboardSound]);

    // ==================== 单词切换 ====================

    const switchToNextWord = useCallback(() => {
      if (!currentDict) return

      setState(prev => {
        const nextIndex = prev.currentIndex + 1;
        if (nextIndex >= currentDict.words.length) {
          return { ...prev, currentIndex: 0, userInput: '' };
        }
        return { ...prev, currentIndex: nextIndex, userInput: '' };
      });
    }, [currentDict]);

    // 单词切换时播放发音
    useEffect(() => {
      if (state.pronunciationEnabled && currentWord && !isLoading) {
        setTimeout(() => {
          playPronunciation();
        }, 300);
      }
    }, [state.currentIndex, state.pronunciationEnabled, currentWord, playPronunciation, isLoading]);

    // ==================== 键盘处理 ====================

    const handleKeyPress = useCallback((e: KeyboardEvent) => {
      if (e.key.length > 1 && e.key !== 'Backspace') return;

      // 开始计时
      if (state.userInput.length === 0 && state.startTime === null) {
        setState(prev => ({ ...prev, startTime: Date.now() }));
      }

      // Backspace
      if (e.key === 'Backspace') {
        if (state.userInput.length > 0) {
          setState(prev => ({ ...prev, userInput: prev.userInput.slice(0, -1) }));
        }
        return;
      }

      // 普通字符输入
      if (state.userInput.length >= currentWord.length) return;

      const targetChar = currentWord[state.userInput.length];
      const isCorrect = e.key === targetChar;

      setState(prev => ({
        ...prev,
        userInput: prev.userInput + e.key,
        totalKeystrokes: prev.totalKeystrokes + 1,
        correctKeystrokes: isCorrect ? prev.correctKeystrokes + 1 : prev.correctKeystrokes,
      }));

      playTypingSound(isCorrect);

      if (!isCorrect) {
        setState(prev => ({ ...prev, shakeTrigger: prev.shakeTrigger + 1 }));
      }
    }, [state.userInput, state.userInput.length, currentWord, state.startTime, state.totalKeystrokes, state.correctKeystrokes, playTypingSound]);

    useEffect(() => {
      if (!isLoading) {
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
      }
    }, [handleKeyPress, isLoading]);

    // 检查完成
    useEffect(() => {
      if (state.userInput === currentWord && state.userInput.length > 0) {
        setTimeout(() => {
          switchToNextWord();
        }, 300);
      }
    }, [state.userInput, currentWord, switchToNextWord]);

    // ==================== 渲染函数 ====================

    const getCharDisplay = (index: number): string => {
      if (index < state.userInput.length) {
        return state.userInput[index];
      }
      if (state.isBlindMode) {
        return '•';
      }
      return currentWord[index];
    };

    const getCharStyle = (index: number): string => {
      const isNew = index === state.userInput.length - 1 && index >= 0;

      if (index < state.userInput.length) {
        const isCorrect = state.userInput[index] === currentWord[index];
        return isCorrect
          ? 'text-success font-bold'
          : 'text-error font-bold';
      }

      if (index === state.userInput.length) {
        return 'text-primary border-b-4 border-primary bg-primary-light px-1 scale-110 rounded';
      }

      return state.isBlindMode ? 'text-text-sub' : 'text-gray-300';
    };

    // ==================== 辅助函数 ====================

    const resetProgress = () => {
      setState(prev => ({
        ...prev,
        currentIndex: 0,
        userInput: '',
        correctKeystrokes: 0,
        totalKeystrokes: 0,
        startTime: null,
      }));
    };

    // ==================== 加载状态 ====================

    if (isLoading) {
      return (
        <div className="min-h-screen bg-bg-soft font-sans text-text-main flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-600 font-semibold">加载词库中...</p>
          </div>
        </div>
      )
    }

    if (loadError || !currentDict) {
      return (
        <div className="min-h-screen bg-bg-soft font-sans text-text-main flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg text-red-600 font-semibold mb-4">
              {loadError || '词库加载失败'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
            >
              刷新页面
            </button>
          </div>
        </div>
      )
    }

    // ==================== 渲染 ====================

    return (
      <div className="min-h-screen bg-bg-soft font-sans text-text-main overflow-hidden">
        {/* ==================== 顶部导航栏 ==================== */}
        <motion.header
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-40"
        >
          <div className="bg-white/90 backdrop-blur-md shadow-glass rounded-full px-6 py-3 flex items-center gap-6 border border-primary-100">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <motion.div
                className="w-8 h-8 bg-gradient-to-br from-primary to-primary-hover rounded-lg flex items-center justify-center"
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
              >
                <span className="text-white font-bold text-sm">TV</span>
              </motion.div>
              <span className="font-bold text-lg text-text-main">Typing Vocab</span>
            </div>

            {/* 分隔线 */}
            <div className="w-px h-6 bg-gray-200" />

            {/* 快速开关 - 所有设置直接显示 */}
            <div className="flex items-center gap-3">
              {/* 发音开关 */}
              <div className="flex items-center gap-1.5">
                <IconButton
                  icon={Volume2}
                  isActive={state.pronunciationEnabled}
                  onClick={() => setState(prev => ({ ...prev, pronunciationEnabled: !prev.pronunciationEnabled }))}
                  label={state.pronunciationEnabled ? '发音已开启' : '发音已关闭'}
                />
                <span className="text-xs text-gray-600 hidden sm:inline">发音</span>
              </div>

              {/* 默写模式开关 */}
              <div className="flex items-center gap-1.5">
                <IconButton
                  icon={state.isBlindMode ? EyeOff : Eye}
                  isActive={state.isBlindMode}
                  onClick={() => setState(prev => ({ ...prev, isBlindMode: !prev.isBlindMode }))}
                  label={state.isBlindMode ? '默写模式' : '练习模式'}
                />
                <span className="text-xs text-gray-600 hidden sm:inline">默写</span>
              </div>

              {/* 显示释义开关 */}
              <div className="flex items-center gap-1.5">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setState(prev => ({ ...prev, showTranslation: !prev.showTranslation }))}
                  className={`p-2 rounded-lg transition-colors ${
                    state.showTranslation ? 'bg-primary-light text-primary' : 'bg-gray-100 text-gray-400'
                  }`}
                  title={state.showTranslation ? '隐藏释义' : '显示释义'}
                >
                  <span className="text-xs font-bold">译</span>
                </motion.button>
                <span className="text-xs text-gray-600 hidden sm:inline">释义</span>
              </div>

              {/* 音效开关 */}
              <div className="flex items-center gap-1.5">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setState(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }))}
                  className={`p-2 rounded-lg transition-colors ${
                    state.soundEnabled ? 'bg-primary-light text-primary' : 'bg-gray-100 text-gray-400'
                  }`}
                  title={state.soundEnabled ? '音效已开启' : '音效已关闭'}
                >
                  <Music size={16} />
                </motion.button>
                <span className="text-xs text-gray-600 hidden sm:inline">音效</span>
              </div>

              {/* 键盘音色选择 */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-600">音色:</span>
                {(['mech', 'soft', 'none'] as SoundType[]).map((sound) => (
                  <motion.button
                    key={sound}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setState(prev => ({ ...prev, keyboardSound: sound }))}
                    className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                      state.keyboardSound === sound
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                    title={sound === 'mech' ? '机械键盘' : sound === 'soft' ? '柔和键盘' : '关闭音效'}
                  >
                    {sound === 'mech' ? '机械' : sound === 'soft' ? '柔和' : '关'}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* 分隔线 */}
            <div className="w-px h-6 bg-gray-200" />

            {/* 词库选择 */}
            <select
              value={state.currentDict}
              onChange={(e) => {
                const newDict = e.target.value;
                setState(prev => ({
                  ...prev,
                  currentDict: newDict,
                  currentIndex: 0,
                  userInput: '',
                  correctKeystrokes: 0,
                  totalKeystrokes: 0,
                  startTime: null,
                }));
              }}
              className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-text-main font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent cursor-pointer hover:bg-gray-100 transition-colors"
            >
              {availableDicts.map(dict => (
                <option key={dict.id} value={dict.id}>
                  {dict.name} ({dict.words.length}词)
                </option>
              ))}
            </select>
          </div>
        </motion.header>

        {/* ==================== 主内容区 ==================== */}
        <main className="min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-32">
          {/* 单词卡片 */}
          <motion.div
            key={`${state.currentDict}-${state.currentIndex}`}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="w-full max-w-3xl"
          >
            <motion.div
              variants={shakeVariants}
              animate={state.shakeTrigger > 0 ? 'shake' : 'visible'}
              className="bg-white rounded-3xl shadow-glass p-12 border border-primary-100"
            >
              {/* 中文释义行 */}
              {state.showTranslation && (
                <motion.div
                  variants={itemVariants}
                  className="mb-8"
                >
                  <div className="flex items-center justify-center gap-3">
                    <motion.p
                      className="text-3xl font-bold text-text-main"
                      animate={{ opacity: [0, 1], y: [10, 0] }}
                      transition={{ duration: 0.3 }}
                    >
                      {currentTrans}
                    </motion.p>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={playPronunciation}
                      className="p-2 text-text-sub hover:text-primary hover:bg-primary-light rounded-lg transition-all"
                      disabled={state.isPlayingPronunciation}
                    >
                      {state.isPlayingPronunciation ? (
                        <motion.span
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 0.5, repeat: Infinity }}
                        >
                          <Volume2 size={24} className="text-primary" />
                        </motion.span>
                      ) : (
                        <Volume2 size={24} />
                      )}
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* 英文单词行 */}
              <motion.div
                variants={itemVariants}
                className="flex justify-center items-center gap-2 text-7xl font-bold tracking-wider min-h-[100px] mb-8"
              >
                <AnimatePresence mode="popLayout">
                  {currentWord.split('').map((char, index) => (
                    <motion.span
                      key={`${index}-${state.userInput[index] || 'empty'}`}
                      className={`transition-all duration-150 ${getCharStyle(index)}`}
                      variants={popVariants}
                      animate={index === state.userInput.length - 1 ? 'pop' : 'visible'}
                    >
                      {getCharDisplay(index)}
                    </motion.span>
                  ))}
                </AnimatePresence>
              </motion.div>

              {/* 进度指示器 */}
              <motion.div
                variants={itemVariants}
                className="flex items-center justify-center gap-2 mt-8"
              >
                {currentWord.split('').map((_, index) => {
                  let dotColor = 'bg-gray-200';
                  if (index < state.userInput.length) {
                    dotColor = state.userInput[index] === currentWord[index] ? 'bg-success' : 'bg-error';
                  } else if (index === state.userInput.length) {
                    dotColor = 'bg-primary';
                  }

                  return (
                    <motion.div
                      key={index}
                      className={`w-2 h-2 rounded-full transition-colors duration-200 ${dotColor}`}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                    />
                  );
                })}
              </motion.div>
            </motion.div>
          </motion.div>

          {/* 重置进度按钮 */}
          <div className="mt-6 flex justify-center">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={resetProgress}
              className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all text-sm font-semibold text-text-main flex items-center gap-2"
            >
              <RotateCcw size={18} />
              重置进度
            </motion.button>
          </div>

          {/* 提示文字 */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-4 text-center text-sm text-text-sub"
          >
            直接输入 • Backspace 删除 • 完全匹配后自动继续
          </motion.p>
        </main>

        {/* ==================== 底部统计栏 ==================== */}
        <motion.footer
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.2 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40"
        >
          <div className="bg-white/90 backdrop-blur-md shadow-glass rounded-2xl px-8 py-4 border border-primary-100">
            <div className="grid grid-cols-4 gap-8">
              {/* 时间 */}
              <div className="text-center">
                <div className="text-xs text-text-sub mb-1 font-medium">TIME</div>
                <motion.div
                  key={getElapsedTime()}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  className="text-xl font-bold text-text-main"
                >
                  {Math.floor(getElapsedTime() / 60)}:{(getElapsedTime() % 60).toString().padStart(2, '0')}
                </motion.div>
              </div>

              {/* 计数 */}
              <div className="text-center">
                <div className="text-xs text-text-sub mb-1 font-medium">COUNT</div>
                <motion.div
                  key={state.currentIndex}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  className="text-xl font-bold text-text-main"
                >
                  {state.currentIndex + 1} / {currentDict.words.length}
                </motion.div>
              </div>

              {/* WPM */}
              <div className="text-center">
                <div className="text-xs text-text-sub mb-1 font-medium">WPM</div>
                <motion.div
                  key={calculateWPM()}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  className="text-xl font-bold text-primary"
                >
                  {calculateWPM()}
                </motion.div>
              </div>

              {/* 准确率 */}
              <div className="text-center">
                <div className="text-xs text-text-sub mb-1 font-medium">ACCURACY</div>
                <motion.div
                  key={calculateAccuracy()}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  className="text-xl font-bold text-success"
                >
                  {calculateAccuracy()}%
                </motion.div>
              </div>
            </div>
          </div>
        </motion.footer>
      </div>
    );
  }
