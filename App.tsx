import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Theme, Mode, AspectRatio, UploadedImage, Prompt, Output } from './types';
import { generateImageEdit, generateVideo } from './services/geminiService';
import { SpinnerIcon } from './components/icons';
import { NeoCard } from './components/NeoCard';
import { NeoButton } from './components/NeoButton';

const API_CONCURRENCY_LIMIT = 2; // For images

const Header: React.FC<{ theme: Theme; onToggle: () => void }> = ({ theme, onToggle }) => (
    <header className="flex justify-between items-center">
        <h1 className="text-3xl text-light-text dark:text-dark-text" style={{ letterSpacing: '-1.5px' }}>
            <span className="font-bold">Every</span><span className="font-light">Banana</span> 🍌
        </h1>
        <NeoButton onClick={onToggle} className="p-2 text-xl w-10 h-10 flex items-center justify-center">
            {theme === 'light' ? '🌙' : '☀️'}
        </NeoButton>
    </header>
);

const ModeSelector: React.FC<{ mode: Mode; onSelect: (mode: Mode) => void; disabled: boolean }> = ({ mode, onSelect, disabled }) => (
    <NeoCard>
        <h2 className="text-lg font-bold mb-2 text-light-text dark:text-dark-text">Mode</h2>
        <div className="grid grid-cols-2 gap-2">
            {(['single', 'multi', 'video', 'character'] as Mode[]).map(m => (
                <button
                    key={m}
                    onClick={() => onSelect(m)}
                    disabled={disabled}
                    className={`py-3 px-2 rounded-full text-center font-bold transition-all text-sm capitalize disabled:opacity-50 ${mode === m ? 'bg-light-text text-light-bg dark:bg-dark-text dark:text-dark-bg' : 'text-light-text dark:text-dark-text opacity-60 hover:opacity-100 border-2 border-light-text dark:border-dark-text'}`}
                >
                    {m === 'video' || m === 'character' ? m : `${m} Prompt`}
                </button>
            ))}
        </div>
        <p className="text-xs text-center mt-2 h-6 text-light-text/70 dark:text-dark-text/70">
            {mode === 'single' && 'One prompt for all images.'}
            {mode === 'multi' && 'A different prompt for each image.'}
            {mode === 'video' && 'Generate a video from a prompt and an optional image.'}
            {mode === 'character' && 'Define a character and style, then describe the action.'}
        </p>
    </NeoCard>
);

const ApiKeySelector: React.FC<{
    hasApiKey: boolean;
    onSelectKey: () => void;
    apiKeyError: string | null;
}> = ({ hasApiKey, onSelectKey, apiKeyError }) => (
    <NeoCard>
        <h2 className="text-lg font-bold mb-2 text-light-text dark:text-dark-text">API Key Required for Video</h2>
        <p className="text-sm mb-4 text-light-text/80 dark:text-dark-text/80">Video generation is a premium feature. Please select your project's API key to continue. This will incur costs on your Google Cloud project.</p>
        <p className="text-xs mb-4 text-light-text/60 dark:text-dark-text/60">For more details on billing, visit <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline">ai.google.dev/gemini-api/docs/billing</a>.</p>
        <NeoButton onClick={onSelectKey} className="w-full py-2" bgColorClass={hasApiKey ? "bg-accent-3" : "bg-accent-2"}>
            {hasApiKey ? "API Key Selected" : "Select API Key"}
        </NeoButton>
        {apiKeyError && <p className="text-sm text-center mt-2 text-light-error dark:text-dark-error">{apiKeyError}</p>}
    </NeoCard>
);

const CharacterPrompt: React.FC<{ prompt: string; onPromptChange: (value: string) => void }> = ({ prompt, onPromptChange }) => (
    <NeoCard>
        <h2 className="text-lg font-bold mb-2 text-light-text dark:text-dark-text">Character Prompt</h2>
        <textarea
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            className="w-full p-2 h-24 resize-none border-2 border-light-text dark:border-dark-text rounded-xl bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text focus:outline-none focus:ring-2 ring-accent-1"
            placeholder={'e.g., A brave knight banana with shiny armor...'}
        />
        <p className="text-xs text-center mt-2 text-light-text/70 dark:text-dark-text/70">Describe the character you want to see in the images.</p>
    </NeoCard>
);

const StyleSelector: React.FC<{ selectedStyle: string | null; onSelect: (style: string) => void }> = ({ selectedStyle, onSelect }) => {
    const styles = ['Fairy Tale', 'Cyberpunk', 'Fantasy', 'Animation', 'Retro', 'Steampunk'];
    return (
        <NeoCard>
            <h2 className="text-lg font-bold mb-2 text-light-text dark:text-dark-text">Select Style</h2>
            <div className="grid grid-cols-3 gap-2">
                {styles.map(style => (
                    <button
                        key={style}
                        onClick={() => onSelect(style)}
                        className={`py-3 px-2 rounded-full text-center font-bold transition-all text-sm capitalize ${selectedStyle === style ? 'bg-light-text text-light-bg dark:bg-dark-text dark:text-dark-bg' : 'text-light-text dark:text-dark-text opacity-60 hover:opacity-100 border-2 border-light-text dark:border-dark-text'}`}
                    >
                        {style}
                    </button>
                ))}
            </div>
        </NeoCard>
    );
};


const ImageUploader: React.FC<{
    images: UploadedImage[];
    onUpload: (files: FileList) => void;
    onRemove: (id: number) => void;
    onClear: () => void;
    mode: Mode;
}> = ({ images, onUpload, onRemove, onClear, mode }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const isVideoMode = mode === 'video';
    const canUploadMore = !isVideoMode || images.length === 0;

    return (
        <NeoCard>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-light-text dark:text-dark-text">
                    {isVideoMode ? 'Upload Optional Image (Max 1)' : 'Upload Images'}
                </h2>
                {images.length > 0 && <button onClick={onClear} className="text-sm font-semibold text-light-text dark:text-dark-text hover:text-light-error dark:hover:text-dark-error transition-colors">Clear All</button>}
            </div>
            {images.length > 0 && (
                 <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-4">
                    {images.map(img => (
                        <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden border-2 border-light-text dark:border-dark-text">
                            <img src={`data:${img.file.type};base64,${img.base64Data}`} alt={img.file.name} className="w-full h-full object-cover"/>
                            <button onClick={() => onRemove(img.id)} className="absolute top-1 right-1 bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text rounded-full w-6 h-6 flex items-center justify-center font-bold border border-light-text dark:border-dark-text text-xs hover:bg-light-error hover:text-dark-text transition-colors">X</button>
                        </div>
                    ))}
                 </div>
            )}
            <NeoButton onClick={() => fileInputRef.current?.click()} className="w-full text-center block py-3" bgColorClass="bg-accent-2" disabled={!canUploadMore}>
                {isVideoMode ? (images.length > 0 ? 'Replace Image' : 'Add Image') : 'Add Images'}
            </NeoButton>
            <input type="file" ref={fileInputRef} className="hidden" multiple={!isVideoMode} accept="image/*" onChange={(e) => e.target.files && onUpload(e.target.files)} />
        </NeoCard>
    );
};

const SinglePrompt: React.FC<{ 
    prompt: string; 
    onPromptChange: (value: string) => void;
    title?: string;
    placeholder?: string;
    description?: string;
}> = ({ prompt, onPromptChange, title="Prompt", placeholder="e.g., A cheerful banana character...", description="This prompt will be applied to all uploaded images." }) => (
    <NeoCard>
        <h2 className="text-lg font-bold mb-2 text-light-text dark:text-dark-text">{title}</h2>
        <textarea 
            value={prompt} 
            onChange={(e) => onPromptChange(e.target.value)} 
            className="w-full p-2 h-24 resize-none border-2 border-light-text dark:border-dark-text rounded-xl bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text focus:outline-none focus:ring-2 ring-accent-1" 
            placeholder={placeholder}
        />
        <p className="text-xs text-center mt-2 text-light-text/70 dark:text-dark-text/70">{description}</p>
    </NeoCard>
);

const MultiPrompt: React.FC<{
    prompts: Prompt[];
    onPromptChange: (id: number, text: string) => void;
    images: UploadedImage[];
}> = ({ prompts, onPromptChange, images }) => (
    <NeoCard>
        <h2 className="text-lg font-bold mb-2 text-light-text dark:text-dark-text">Prompts</h2>
        {images.length > 0 ? (
            <div className="space-y-4">
                {images.map(img => {
                    const prompt = prompts.find(p => p.id === img.id);
                    return (
                        <div key={img.id} className="flex items-start gap-3">
                             <img src={`data:${img.file.type};base64,${img.base64Data}`} alt={img.file.name} className="w-16 h-16 object-cover rounded-md border-2 border-light-text dark:border-dark-text"/>
                             <textarea
                                value={prompt?.text || ''}
                                onChange={(e) => onPromptChange(img.id, e.target.value)}
                                className="w-full p-2 h-16 resize-none border-2 border-light-text dark:border-dark-text rounded-xl bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text focus:outline-none focus:ring-2 ring-accent-1"
                                placeholder={`Prompt for ${img.file.name}...`}
                             />
                        </div>
                    )
                })}
            </div>
        ) : (
            <p className="text-sm text-center py-8 text-light-text/50 dark:text-dark-text/50">Upload images to add prompts.</p>
        )}
    </NeoCard>
);

const VideoPrompt: React.FC<{
    prompt: string;
    onPromptChange: (value: string) => void;
    aspectRatio: AspectRatio;
    onAspectRatioChange: (ratio: AspectRatio) => void;
}> = ({ prompt, onPromptChange, aspectRatio, onAspectRatioChange }) => (
    <NeoCard>
        <h2 className="text-lg font-bold mb-2 text-light-text dark:text-dark-text">Video Prompt</h2>
        <textarea 
            value={prompt} 
            onChange={(e) => onPromptChange(e.target.value)} 
            className="w-full p-2 h-24 resize-none border-2 border-light-text dark:border-dark-text rounded-xl bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text focus:outline-none focus:ring-2 ring-accent-1" 
            placeholder={'e.g., A banana character skateboarding through a futuristic city...'}
        />
        <div className="mt-4">
            <h3 className="text-md font-bold mb-2 text-light-text dark:text-dark-text">Aspect Ratio</h3>
            <div className="flex gap-2">
                 {(['16:9', '9:16'] as AspectRatio[]).map(ratio => (
                     <button key={ratio} onClick={() => onAspectRatioChange(ratio)} className={`flex-1 py-2 rounded-full font-bold transition-colors ${aspectRatio === ratio ? 'bg-light-text text-light-bg dark:bg-dark-text dark:text-dark-bg' : 'text-light-text dark:text-dark-text border-2 border-light-text dark:border-dark-text'}`}>
                         {ratio} {ratio === '16:9' ? '(Landscape)' : '(Portrait)'}
                     </button>
                 ))}
            </div>
        </div>
    </NeoCard>
);

const PromptManager: React.FC<{
    mode: Mode;
    prompts: Prompt[];
    onPromptChange: (id: number, text: string) => void;
    images: UploadedImage[];
    aspectRatio: AspectRatio;
    onAspectRatioChange: (ratio: AspectRatio) => void;
}> = ({ mode, prompts, onPromptChange, images, aspectRatio, onAspectRatioChange }) => {
    switch (mode) {
        case 'single':
            return <SinglePrompt prompt={prompts[0]?.text || ''} onPromptChange={(text) => onPromptChange(0, text)} />;
        case 'multi':
            return <MultiPrompt prompts={prompts} onPromptChange={onPromptChange} images={images} />;
        case 'video':
            return <VideoPrompt prompt={prompts[0]?.text || ''} onPromptChange={(text) => onPromptChange(0, text)} aspectRatio={aspectRatio} onAspectRatioChange={onAspectRatioChange} />;
        case 'character':
             return <SinglePrompt 
                prompt={prompts[0]?.text || ''} 
                onPromptChange={(text) => onPromptChange(0, text)} 
                title="Action Prompt"
                placeholder="e.g., ...riding a majestic horse into the sunset."
                description="Describe what your character is doing in the scene."
            />;
        default:
            return null;
    }
}

const OutputCard: React.FC<{ output: Output, onRegenerate: (id: number) => void, onDownload: (output: Output) => void }> = ({ output, onRegenerate, onDownload }) => {
    let content: React.ReactNode;
    switch (output.status) {
        case 'pending': content = <p className="text-sm opacity-50">Waiting in queue...</p>; break;
        case 'generating':
            content = (
                <div className="flex flex-col items-center gap-2 animate-pulse text-center p-2">
                    <SpinnerIcon className="w-5 h-5 animate-spin" />
                    <span>{output.type === 'image' ? 'Processing...' : (output.progressMessage || 'Generating...')}</span>
                </div>
            ); 
            break;
        case 'complete': 
            if (output.type === 'image' && output.imageUrl) {
                content = <img src={output.imageUrl} alt={`Generated for ${output.promptText}`} className="w-full h-full object-cover rounded-lg" />;
            } else if (output.type === 'video' && output.videoUrl) {
                content = <video src={output.videoUrl} controls autoPlay loop muted playsInline className="w-full h-full object-cover rounded-lg" />;
            }
            break;
        case 'error': content = <div className="p-2 text-center text-sm text-light-error dark:text-dark-error"><p><strong>Error</strong></p><p className="text-xs max-w-full truncate" title={output.error || ''}>{output.error}</p></div>; break;
    }

    return (
        <NeoCard className="space-y-3">
            <p className="font-bold text-center text-light-text dark:text-dark-text truncate" title={output.promptText}>{output.promptText}</p>
            <div className="aspect-square rounded-lg flex items-center justify-center bg-gray-500/10 border-2 border-dashed border-light-text/50 dark:border-dark-text/50">
                {content}
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
                {output.status === 'complete' && (output.imageUrl || output.videoUrl) && (
                    <>
                        <NeoButton onClick={() => onDownload(output)}>Download</NeoButton>
                        <NeoButton onClick={() => onRegenerate(output.id)}>Regenerate</NeoButton>
                    </>
                )}
                {output.status === 'error' && (
                     <div className="col-span-2">
                        <NeoButton onClick={() => onRegenerate(output.id)} className="w-full">Try Again</NeoButton>
                    </div>
                )}
            </div>
        </NeoCard>
    );
};

export default function App() {
    const [theme, setTheme] = useState<Theme>('light');
    const [mode, setMode] = useState<Mode>('single');
    const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
    const [prompts, setPrompts] = useState<Prompt[]>([{ id: 0, text: '' }]);
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
    const [outputs, setOutputs] = useState<Output[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    
    const [characterPrompt, setCharacterPrompt] = useState('');
    const [selectedStyle, setSelectedStyle] = useState<string | null>(null);

    const [hasApiKey, setHasApiKey] = useState(false);
    const [apiKeyError, setApiKeyError] = useState<string | null>(null);

    const nextId = useRef(0);
    const abortControllerRef = useRef<AbortController | null>(null);
    const activeRequests = useRef(0);
    
    useEffect(() => {
        const savedTheme = localStorage.getItem('drexbanana-theme') as Theme;
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setTheme(savedTheme || (prefersDark ? 'dark' : 'light'));
    }, []);

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark'); // Correctly remove 'light', should be 'dark'
        }
        localStorage.setItem('drexbanana-theme', theme);
    }, [theme]);
    
    useEffect(() => {
        if (mode === 'video') {
            const checkApiKey = async () => {
                const hasKey = await window.aistudio.hasSelectedApiKey();
                setHasApiKey(hasKey);
            };
            checkApiKey();
        }
    }, [mode]);

    const handleThemeToggle = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

    const handleSelectApiKey = async () => {
        try {
            await window.aistudio.openSelectKey();
            setHasApiKey(true);
            setApiKeyError(null);
        } catch (e) {
            console.error("API Key selection cancelled or failed", e);
        }
    };
    
    const handleModeSelect = (newMode: Mode) => {
        if (isGenerating) return;
        setMode(newMode);
        setUploadedImages([]);
        setPrompts([{ id: 0, text: '' }]);
        setOutputs([]);
        setCharacterPrompt('');
        setSelectedStyle(null);
    };

    const handleFileUpload = async (files: FileList) => {
        const newImages: UploadedImage[] = [];
        for (const file of Array.from(files)) {
            const id = nextId.current++;
            const base64Data = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve((reader.result as string).split(',')[1]);
                reader.onerror = error => reject(error);
            });
            newImages.push({ id, file, base64Data });
        }
        if (mode === 'video') {
            setUploadedImages(newImages.slice(0, 1));
        } else {
            setUploadedImages(prev => [...prev, ...newImages]);
            const newPrompts = newImages.map(img => ({ id: img.id, text: '' }));
            setPrompts(prev => [...prev, ...newPrompts]);
        }
    };
    
    const handleRemoveImage = (id: number) => {
        setUploadedImages(prev => prev.filter(img => img.id !== id));
        if (mode === 'multi') {
            setPrompts(prev => prev.filter(p => p.id !== id));
        }
    };
    
    const handleClearImages = () => {
        setUploadedImages([]);
        if (mode === 'multi') {
            setPrompts(prev => prev.filter(p => p.id === 0)); // Keep only the single prompt placeholder
        }
    };
    
    const handlePromptChange = (id: number, text: string) => {
        if (mode === 'multi') {
            setPrompts(prev => {
                const existing = prev.find(p => p.id === id);
                if (existing) {
                    return prev.map(p => p.id === id ? { ...p, text } : p);
                }
                return [...prev, { id, text }];
            });
        } else { // single, video, character mode
            setPrompts([{ id: 0, text }]);
        }
    };

    const handleGenerate = () => {
        if (isGenerating) return;

        let isReady = false;
        let newOutputs: Output[] = [];
        
        const promptText = prompts[0]?.text.trim();

        switch (mode) {
            case 'single':
                isReady = uploadedImages.length > 0 && promptText !== '';
                if (isReady) {
                    const finalPrompt = `Maintain the visual appearance of the character from the uploaded image. Apply the following changes: ${promptText}`;
                    newOutputs = uploadedImages.map(image => ({
                        id: nextId.current++,
                        sourceImageId: image.id,
                        promptText: finalPrompt,
                        type: 'image',
                        status: 'pending',
                        error: null,
                        imageUrl: null,
                        videoUrl: null,
                    }));
                }
                break;
            case 'multi':
                const multiPrompts = prompts.filter(p => p.id !== 0 && p.text.trim() !== '');
                isReady = uploadedImages.length > 0 && multiPrompts.length > 0;
                if(isReady){
                    newOutputs = uploadedImages
                        .map(image => ({ image, prompt: prompts.find(p => p.id === image.id) }))
                        .filter(({ prompt }) => prompt && prompt.text.trim() !== '')
                        .map(({ image, prompt }) => ({
                            id: nextId.current++,
                            sourceImageId: image.id,
                            promptText: `Maintain the visual appearance of the character from the uploaded image. Apply the following changes: ${prompt!.text}`,
                            type: 'image',
                            status: 'pending',
                            error: null,
                            imageUrl: null,
                            videoUrl: null,
                        }));
                }
                break;
            case 'video':
                isReady = promptText !== '' && hasApiKey;
                if(isReady) {
                    newOutputs.push({
                        id: nextId.current++,
                        sourceImageId: uploadedImages[0]?.id || null,
                        promptText: promptText,
                        type: 'video',
                        status: 'pending',
                        error: null,
                        imageUrl: null,
                        videoUrl: null,
                    });
                }
                break;
            case 'character':
                const actionPrompt = prompts[0]?.text.trim();
                isReady = uploadedImages.length > 0 && characterPrompt.trim() !== '' && actionPrompt !== '' && !!selectedStyle;
                if (isReady) {
                    const finalPrompt = `The character in the image is best described as: '${characterPrompt.trim()}'. Now, maintaining the character's core appearance from the image, depict them ${actionPrompt}. The overall style should be ${selectedStyle}.`;
                    newOutputs = uploadedImages.map(image => ({
                        id: nextId.current++,
                        sourceImageId: image.id,
                        promptText: finalPrompt,
                        type: 'image',
                        status: 'pending',
                        error: null,
                        imageUrl: null,
                        videoUrl: null,
                    }));
                }
                break;
        }

        if (isReady && newOutputs.length > 0) {
            abortControllerRef.current = new AbortController();
            setIsGenerating(true);
            setOutputs(newOutputs);
            setApiKeyError(null);
        }
    };

    const processQueue = useCallback(async () => {
        const outputToProcess = outputs.find(o => o.status === 'pending');
        if (!outputToProcess || !isGenerating) return;

        // Video processing is one at a time
        if (outputToProcess.type === 'video' && activeRequests.current > 0) return;
        // Image processing respects concurrency limit
        if (outputToProcess.type === 'image' && activeRequests.current >= API_CONCURRENCY_LIMIT) return;

        activeRequests.current++;
        setOutputs(prev => prev.map(o => o.id === outputToProcess.id ? { ...o, status: 'generating' } : o));
        
        const sourceImage = uploadedImages.find(img => img.id === outputToProcess.sourceImageId);

        if (abortControllerRef.current) {
            try {
                if (outputToProcess.type === 'image' && sourceImage) {
                    const imageUrl = await generateImageEdit(sourceImage.base64Data, outputToProcess.promptText, abortControllerRef.current.signal);
                    setOutputs(prev => prev.map(o => o.id === outputToProcess.id ? { ...o, status: 'complete', imageUrl } : o));
                } else if (outputToProcess.type === 'video') {
                    const onProgress = (message: string) => {
                         setOutputs(prev => prev.map(o => o.id === outputToProcess.id ? { ...o, progressMessage: message } : o));
                    };
                    const videoUrl = await generateVideo(outputToProcess.promptText, aspectRatio, abortControllerRef.current.signal, onProgress, sourceImage?.base64Data);
                    setOutputs(prev => prev.map(o => o.id === outputToProcess.id ? { ...o, status: 'complete', videoUrl } : o));
                }
            } catch (error: any) {
                 const errorMessage = error.message === 'Aborted' ? 'Cancelled by user.' : error.message;
                 setOutputs(prev => prev.map(o => o.id === outputToProcess.id ? { ...o, status: 'error', error: errorMessage } : o));
                 if (errorMessage.includes("API key error")) {
                    setApiKeyError("API key error. Please select your API key again.");
                    setHasApiKey(false);
                 }
            }
        }

        activeRequests.current--;
    }, [outputs, isGenerating, uploadedImages, aspectRatio]);

    useEffect(() => {
        const pendingCount = outputs.filter(o => o.status === 'pending').length;
        const generatingCount = outputs.filter(o => o.status === 'generating').length;

        if (isGenerating) {
            if (pendingCount === 0 && generatingCount === 0) {
                setIsGenerating(false);
            } else if (pendingCount > 0) {
                const limit = outputs.some(o => o.type === 'video' && (o.status === 'pending' || o.status === 'generating')) ? 1 : API_CONCURRENCY_LIMIT;
                if (activeRequests.current < limit) {
                    for (let i = 0; i < limit - activeRequests.current; i++) {
                        processQueue();
                    }
                }
            }
        }
    }, [outputs, isGenerating, processQueue]);
    
    const handleCancel = () => {
        abortControllerRef.current?.abort();
        setIsGenerating(false);
        setOutputs(prev => prev.map(o => (o.status === 'pending' || o.status === 'generating' ? { ...o, status: 'error', error: 'Cancelled by user.' } : o)));
    };
    
    const handleRegenerate = (id: number) => {
        setOutputs(prev => prev.map(o => o.id === id ? { ...o, status: 'pending', error: null, imageUrl: null, videoUrl: null } : o));
        if (!isGenerating) {
            setIsGenerating(true);
            abortControllerRef.current = new AbortController();
        }
    };
    
    const completedCount = outputs.filter(o => o.status === 'complete' || o.status === 'error').length;

    const handleDownloadAll = () => {
        outputs.forEach((output, index) => {
            if (output.status === 'complete') {
                setTimeout(() => {
                    handleDownload(output);
                }, index * 200);
            }
        });
    };

    const handleDownload = (output: Output) => {
        const url = output.type === 'image' ? output.imageUrl : output.videoUrl;
        if (!url) return;
        const extension = output.type === 'image' ? 'png' : 'mp4';
        const filename = `drexbanana_${output.id}.${extension}`;
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };
    
    let isGenerateDisabled = true;
    const promptText = prompts[0]?.text.trim();
    if(mode === 'single' && uploadedImages.length > 0 && promptText !== '') isGenerateDisabled = false;
    if(mode === 'multi' && uploadedImages.length > 0 && prompts.some(p => p.id !== 0 && p.text.trim() !== '')) isGenerateDisabled = false;
    if(mode === 'video' && promptText !== '' && hasApiKey) isGenerateDisabled = false;
    if(mode === 'character' && uploadedImages.length > 0 && characterPrompt.trim() !== '' && promptText !== '' && selectedStyle) isGenerateDisabled = false;

    return (
        <div className="bg-light-bg dark:bg-dark-bg min-h-screen">
            <div className="max-w-md mx-auto p-4 space-y-6">
                <Header theme={theme} onToggle={handleThemeToggle} />
                <ModeSelector mode={mode} onSelect={handleModeSelect} disabled={isGenerating} />
                
                {mode === 'character' && <CharacterPrompt prompt={characterPrompt} onPromptChange={setCharacterPrompt} />}

                {mode === 'video' && <ApiKeySelector hasApiKey={hasApiKey} onSelectKey={handleSelectApiKey} apiKeyError={apiKeyError} />}

                {mode !== 'multi' && <ImageUploader images={uploadedImages} onUpload={handleFileUpload} onRemove={handleRemoveImage} onClear={handleClearImages} mode={mode} />}
                
                <PromptManager
                    mode={mode}
                    prompts={prompts}
                    onPromptChange={handlePromptChange}
                    images={uploadedImages}
                    aspectRatio={aspectRatio}
                    onAspectRatioChange={setAspectRatio}
                />
                
                {mode === 'character' && <StyleSelector selectedStyle={selectedStyle} onSelect={setSelectedStyle} />}

                {mode === 'multi' && <ImageUploader images={uploadedImages} onUpload={handleFileUpload} onRemove={handleRemoveImage} onClear={handleClearImages} mode={mode} />}

                <div>
                    {isGenerating ? (
                        <NeoCard className="text-center">
                            <div className="flex items-center justify-center gap-2 mb-3">
                                <SpinnerIcon className="w-6 h-6 animate-spin" />
                                <span className="text-light-text dark:text-dark-text">Generating... ({completedCount}/{outputs.length})</span>
                            </div>
                            <NeoButton onClick={handleCancel} className="w-full text-center py-2" bgColorClass="bg-light-error text-dark-text">
                                Cancel
                            </NeoButton>
                        </NeoCard>
                    ) : (
                        <NeoButton 
                            onClick={handleGenerate} 
                            className="w-full text-center py-4 text-xl" 
                            bgColorClass="bg-accent-3" 
                            disabled={isGenerateDisabled}>
                            Generate
                        </NeoButton>
                    )}
                </div>

                {outputs.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center pt-4">
                            <h2 className="text-xl font-bold text-light-text dark:text-dark-text">Results</h2>
                            {!isGenerating && outputs.some(o => o.status === 'complete') && (
                                <NeoButton onClick={handleDownloadAll} className="px-4 py-2 text-sm" bgColorClass="bg-accent-1">Download All</NeoButton>
                            )}
                        </div>
                        {outputs.map(o => <OutputCard key={o.id} output={o} onRegenerate={handleRegenerate} onDownload={handleDownload}/>)}
                    </div>
                )}

                <footer className="text-center pt-8 text-light-text/70 dark:text-dark-text/70">
                    <a href="https://ko-fi.com/everyimage" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 mb-4">
                       <NeoButton><span>☕</span> Support Me</NeoButton>
                    </a>
                    <p className="text-xs">Made by @TTJJ</p>
                </footer>
            </div>
        </div>
    );
}