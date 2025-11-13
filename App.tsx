import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality } from '@google/genai';
import { AppState, LanguageOption, TranscriptEntry } from './types';
import LanguageSelector from './components/LanguageSelector';
import ConversationDisplay from './components/ConversationDisplay';
import StatusIndicator from './components/StatusIndicator';
import { createBlobFromAudio, decode, decodeAudioData } from './utils/audio';

const languageOptions: LanguageOption[] = [
    { code: 'en-US', name: 'English', emoji: '🇬🇧' },
    { code: 'zh-CN', name: 'Mandarin Chinese', emoji: '🇨🇳' },
    { code: 'hi-IN', name: 'Hindi', emoji: '🇮🇳' },
    { code: 'es-ES', name: 'Spanish', emoji: '🇪🇸' },
    { code: 'fr-FR', name: 'French', emoji: '🇫🇷' },
    { code: 'ar-SA', name: 'Arabic', emoji: '🇸🇦' },
    { code: 'bn-BD', name: 'Bengali', emoji: '🇧🇩' },
    { code: 'ru-RU', name: 'Russian', emoji: '🇷🇺' },
    { code: 'pt-PT', name: 'Portuguese', emoji: '🇵🇹' },
    { code: 'ur-PK', name: 'Urdu', emoji: '🇵🇰' },
    { code: 'id-ID', name: 'Indonesian', emoji: '🇮🇩' },
    { code: 'de-DE', name: 'German', emoji: '🇩🇪' },
    { code: 'ja-JP', name: 'Japanese', emoji: '🇯🇵' },
    { code: 'sw-KE', name: 'Swahili', emoji: '🇰🇪' },
    { code: 'mr-IN', name: 'Marathi', emoji: '🇮🇳' },
    { code: 'te-IN', name: 'Telugu', emoji: '🇮🇳' },
    { code: 'tr-TR', name: 'Turkish', emoji: '🇹🇷' },
    { code: 'ta-IN', name: 'Tamil', emoji: '🇮🇳' },
    { code: 'yue-Hant-HK', name: 'Cantonese', emoji: '🇭🇰' },
    { code: 'vi-VN', name: 'Vietnamese', emoji: '🇻🇳' },
];

const MicIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M8.25 4.5a3.75 3.75 0 1 1 7.5 0v8.25a3.75 3.75 0 1 1-7.5 0V4.5Z" />
        <path d="M6 10.5a.75.75 0 0 1 .75.75v1.5a5.25 5.25 0 1 0 10.5 0v-1.5a.75.75 0 0 1 1.5 0v1.5a6.75 6.75 0 1 1-13.5 0v-1.5A.75.75 0 0 1 6 10.5Z" />
    </svg>
);

const StopIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path fillRule="evenodd" d="M4.5 7.5a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3v-9Z" clipRule="evenodd" />
    </svg>
);


export default function App() {
    const [appState, setAppState] = useState<AppState>(AppState.Idle);
    const [error, setError] = useState<string | null>(null);
    const [selectedLanguage, setSelectedLanguage] = useState<string>(languageOptions[0].name);
    const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');
    const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    
    const currentInputTranscriptionRef = useRef('');
    const currentOutputTranscriptionRef = useRef('');
    const nextAudioStartTimeRef = useRef(0);
    const audioPlaybackSources = useRef<Set<AudioBufferSourceNode>>(new Set());
    
    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [theme]);

    const handleMessage = useCallback(async (message: LiveServerMessage) => {
        if (message.serverContent?.outputTranscription) {
            currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
        } else if (message.serverContent?.inputTranscription) {
            currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
        }

        if (message.serverContent?.turnComplete) {
            const fullInput = currentInputTranscriptionRef.current.trim();
            const fullOutput = currentOutputTranscriptionRef.current.trim();
            
            setTranscript(prev => {
                const newTranscript = [...prev];
                if (fullInput) {
                    newTranscript.push({ id: Date.now(), speaker: 'user', text: fullInput });
                }
                if (fullOutput) {
                    newTranscript.push({ id: Date.now() + 1, speaker: 'ai', text: fullOutput });
                }
                return newTranscript;
            });

            currentInputTranscriptionRef.current = '';
            currentOutputTranscriptionRef.current = '';
        }

        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
        if (base64Audio) {
            const outputAudioContext = outputAudioContextRef.current;
            if (outputAudioContext) {
                nextAudioStartTimeRef.current = Math.max(nextAudioStartTimeRef.current, outputAudioContext.currentTime);
                const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);
                const source = outputAudioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputAudioContext.destination);
                source.addEventListener('ended', () => {
                    audioPlaybackSources.current.delete(source);
                });
                source.start(nextAudioStartTimeRef.current);
                nextAudioStartTimeRef.current += audioBuffer.duration;
                audioPlaybackSources.current.add(source);
            }
        }
        
        if (message.serverContent?.interrupted) {
            for (const source of audioPlaybackSources.current.values()) {
                source.stop();
                audioPlaybackSources.current.delete(source);
            }
            nextAudioStartTimeRef.current = 0;
        }
    }, []);

    const handleError = useCallback((e: ErrorEvent | CloseEvent) => {
        console.error(e);
        const errorMessage = e instanceof ErrorEvent ? e.message : `Connection closed: ${e.code}`;
        setError(errorMessage);
        setAppState(AppState.Error);
        stopConversation();
    }, []);

    const startConversation = useCallback(async () => {
        setAppState(AppState.Connecting);
        setError(null);
        setTranscript([]);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => setAppState(AppState.Listening),
                    onmessage: handleMessage,
                    onerror: handleError,
                    onclose: (e) => console.log('closed', e),
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                    systemInstruction: `You are a friendly and patient language tutor. The user wants to practice speaking ${selectedLanguage}. Your role is to have a natural conversation with them in ${selectedLanguage}, occasionally correcting their grammar or pronunciation in a gentle and encouraging way. Keep your responses relatively short to encourage a back-and-forth dialogue.`
                }
            });

            mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            const source = inputAudioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
            scriptProcessorRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            
            scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
                const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                const pcmBlob = createBlobFromAudio(inputData);
                if (sessionPromiseRef.current) {
                    sessionPromiseRef.current.then((session) => {
                        session.sendRealtimeInput({ media: pcmBlob });
                    });
                }
            };
            
            source.connect(scriptProcessorRef.current);
            scriptProcessorRef.current.connect(inputAudioContextRef.current.destination);
            
        } catch (err: any) {
            console.error(err);
            setError(err.message);
            setAppState(AppState.Error);
        }
    }, [selectedLanguage, handleMessage, handleError]);

    const stopConversation = useCallback(() => {
        if (sessionPromiseRef.current) {
            sessionPromiseRef.current.then(session => session.close());
            sessionPromiseRef.current = null;
        }

        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }

        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }
        
        if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
            inputAudioContextRef.current.close();
            inputAudioContextRef.current = null;
        }
        
        if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
            outputAudioContextRef.current.close();
            outputAudioContextRef.current = null;
        }

        for (const source of audioPlaybackSources.current.values()) {
            source.stop();
        }
        audioPlaybackSources.current.clear();
        nextAudioStartTimeRef.current = 0;
        
        setAppState(AppState.Idle);
    }, []);

    useEffect(() => {
        return () => {
            stopConversation();
        };
    }, [stopConversation]);

    const isConversationActive = appState === AppState.Listening || appState === AppState.Connecting;

    return (
        <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white flex flex-col items-center p-4 font-sans transition-colors duration-300">
            <header className="w-full max-w-4xl text-center my-8 relative">
                <div className="absolute top-0 right-0 flex gap-4">
                    <button onClick={() => setIsConfigModalOpen(true)} className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">Config</button>
                    <button onClick={() => setIsAboutModalOpen(true)} className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">About</button>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-500 to-indigo-600 text-transparent bg-clip-text">
                    Lingua
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-2">Practice speaking a new language with your AI tutor.</p>
            </header>

            <main className="w-full max-w-4xl flex-1 flex flex-col items-center gap-6">
                 <LanguageSelector
                    languages={languageOptions}
                    selectedLanguage={selectedLanguage}
                    onSelectLanguage={setSelectedLanguage}
                    disabled={isConversationActive}
                />
                
                <ConversationDisplay transcript={transcript} />
                
                <StatusIndicator state={appState} error={error} />
            </main>
            
            <footer className="w-full max-w-4xl py-6 flex flex-col items-center sticky bottom-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
                <button
                    onClick={isConversationActive ? stopConversation : startConversation}
                    disabled={appState === AppState.Connecting}
                    className={`
                        w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 transform
                        ${isConversationActive 
                            ? 'bg-red-600 hover:bg-red-700' 
                            : 'bg-blue-600 hover:bg-blue-700'}
                        text-white shadow-lg focus:outline-none focus:ring-4 focus:ring-opacity-50
                        ${isConversationActive ? 'focus:ring-red-500' : 'focus:ring-blue-500'}
                        disabled:bg-gray-500 disabled:cursor-wait
                    `}
                >
                    {isConversationActive ? <StopIcon /> : <MicIcon />}
                </button>
            </footer>
            
            {isAboutModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 transition-opacity" onClick={() => setIsAboutModalOpen(false)}>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-8 max-w-md w-full relative text-gray-900 dark:text-white" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setIsAboutModalOpen(false)} className="absolute top-3 right-3 text-2xl font-bold text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white">&times;</button>
                        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-transparent bg-clip-text">About Lingua</h2>
                        <p className="mb-6 text-gray-600 dark:text-gray-300">This is an interactive language learning application that provides a real-time conversational AI partner for practice, powered by the Gemini Live API.</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">Made with ❤️ by <a href="https://mco.dev/about" target="_blank" rel="noopener noreferrer" className="text-blue-500 dark:text-blue-400 hover:underline">Marc</a></p>
                    </div>
                </div>
            )}

            {isConfigModalOpen && (
                 <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 transition-opacity" onClick={() => setIsConfigModalOpen(false)}>
                     <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-8 max-w-xs w-full relative text-gray-900 dark:text-white" onClick={e => e.stopPropagation()}>
                         <button onClick={() => setIsConfigModalOpen(false)} className="absolute top-3 right-3 text-2xl font-bold text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white">&times;</button>
                         <h2 className="text-2xl font-bold mb-6">Configuration</h2>
                         <div className="space-y-4">
                             <p className="font-semibold text-gray-700 dark:text-gray-300">Theme</p>
                             <div className="flex gap-4">
                                <button onClick={() => setTheme('light')} className={`w-full px-4 py-2 rounded-md transition-colors ${theme === 'light' ? 'bg-blue-600 text-white font-semibold shadow-md' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>Light</button>
                                <button onClick={() => setTheme('dark')} className={`w-full px-4 py-2 rounded-md transition-colors ${theme === 'dark' ? 'bg-blue-600 text-white font-semibold shadow-md' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>Dark</button>
                             </div>
                         </div>
                     </div>
                 </div>
            )}
        </div>
    );
}