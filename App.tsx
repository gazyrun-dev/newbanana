import React, { useState, useCallback } from 'react';
import { generate } from './services/geminiService';
import { AspectRatio } from './types';
import ConceptSelector from './components/ConceptSelector';
import AspectRatioSelector from './components/AspectRatioSelector';
import LoadingSpinner from './components/LoadingSpinner';
import ImageUploader from './components/ImageUploader';

const Card: React.FC<{children: React.ReactNode, className?: string}> = ({ children, className }) => (
    <div className={`bg-white border-2 border-black rounded-2xl p-5 shadow-[6px_6px_0_0_#000] ${className}`}>
        {children}
    </div>
);

const App: React.FC = () => {
    const [prompt, setPrompt] = useState<string>('');
    const [uploadedImage, setUploadedImage] = useState<File | null>(null);
    const [selectedStyle, setSelectedStyle] = useState<string>('Fairy Tale');
    const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatio>('3:4');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isTextOnlyResult, setIsTextOnlyResult] = useState<boolean>(true);

    const styles = ['Fairy Tale', 'Cyberpunk', 'Fantasy', 'Animation', 'Retro', 'Steampunk'];

    const handleGenerateClick = useCallback(async (newAspectRatio?: AspectRatio) => {
        if (!prompt && !uploadedImage) {
            setError('Please write a prompt or upload an image.');
            return;
        }
        if (isLoading) return;

        setIsLoading(true);
        setError(null);
        setGeneratedImageUrl(null);
        
        const currentAspectRatio = newAspectRatio || selectedAspectRatio;
        if (newAspectRatio) {
            setSelectedAspectRatio(newAspectRatio);
        }
        
        const finalPrompt = `${prompt}, in a ${selectedStyle.toLowerCase()} style.`;
        setIsTextOnlyResult(!uploadedImage);

        try {
            const imageUrl = await generate(finalPrompt, currentAspectRatio, uploadedImage);
            setGeneratedImageUrl(imageUrl);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            setGeneratedImageUrl(null);
        } finally {
            setIsLoading(false);
        }
    }, [prompt, selectedStyle, selectedAspectRatio, isLoading, uploadedImage]);
    
    const handleReset = () => {
        // We keep the prompt and image for easier re-generation
        setGeneratedImageUrl(null);
        setError(null);
    };

    const handleDownload = () => {
        if (!generatedImageUrl) return;
        const link = document.createElement('a');
        link.href = generatedImageUrl;
        link.download = `everybanana-${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const renderContent = () => {
        if (isLoading) {
            return <div className="flex items-center justify-center h-96"><LoadingSpinner /></div>;
        }
        if (error) {
            return (
                <Card>
                    <div className="text-center text-red-600">
                        <p className="font-bold text-lg">Generation Failed</p>
                        <p className="text-sm mt-2">{error}</p>
                        <button onClick={() => setError(null)} className="mt-4 bg-black text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-800 transition-colors">Try Again</button>
                    </div>
                </Card>
            );
        }
        if (generatedImageUrl) {
            return (
                <div className="w-full space-y-4">
                    <Card>
                        <img
                            src={generatedImageUrl}
                            alt="AI generated image"
                            className="w-full rounded-lg"
                        />
                    </Card>

                    {isTextOnlyResult && (
                         <Card>
                            <h2 className="font-bold text-lg mb-3 text-center">Try a different aspect ratio</h2>
                             <AspectRatioSelector
                                selectedAspectRatio={selectedAspectRatio}
                                onSelect={(ratio) => handleGenerateClick(ratio)}
                                isDisabled={isLoading}
                            />
                        </Card>
                    )}

                    <div className="flex gap-4">
                        <button
                            onClick={handleDownload}
                            className="flex-1 bg-white text-black border-2 border-black font-bold py-3 px-4 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black shadow-[4px_4px_0_0_#000] active:shadow-[2px_2px_0_0_#000] active:translate-x-0.5 active:translate-y-0.5"
                        >
                            Download
                        </button>
                         <button
                            onClick={handleReset}
                            className="flex-1 bg-[#9ae99a] text-black border-2 border-black font-bold py-3 px-4 rounded-full hover:bg-[#88d888] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black shadow-[4px_4px_0_0_#000] active:shadow-[2px_2px_0_0_#000] active:translate-x-0.5 active:translate-y-0.5"
                        >
                            Create New
                        </button>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="min-h-screen bg-[#f0f0f0] text-black font-sans flex justify-center p-4 sm:p-6">
            <div className="w-full max-w-md">
                <header className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-extrabold">
                        EveryBanana 🍌
                    </h1>
                     <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border-2 border-black shadow-[4px_4px_0_0_#000]">
                        <span className="text-2xl">🌜</span>
                    </div>
                </header>
                
                <main className="space-y-6">
                    <Card>
                        <div className="flex items-center space-x-4">
                           <button className="bg-black text-white font-bold border-2 border-black rounded-full px-8 py-2">
                               Character
                           </button>
                        </div>
                        <p className="text-gray-600 mt-4">Create slide illustrations from a text prompt.</p>
                    </Card>

                    <Card>
                        <h2 className="font-bold text-xl mb-3">1. Write Prompt</h2>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="e.g., A cat wearing a space helmet"
                            className="w-full h-24 p-3 bg-white border-2 border-black rounded-lg focus:ring-2 focus:ring-black focus:border-black transition-colors placeholder-gray-400 resize-none"
                            disabled={isLoading}
                        />
                    </Card>

                    <Card>
                         <h2 className="font-bold text-xl mb-3">2. Upload Image <span className="text-gray-500 font-normal text-base">(Optional)</span></h2>
                         <ImageUploader 
                            onImageUpload={setUploadedImage}
                            uploadedImage={uploadedImage}
                            isDisabled={isLoading}
                         />
                    </Card>

                    <Card>
                        <h2 className="font-bold text-xl mb-4 text-center">3. Select Style</h2>
                        <ConceptSelector
                            concepts={styles}
                            selectedConcept={selectedStyle}
                            onSelect={setSelectedStyle}
                            isDisabled={isLoading}
                        />
                    </Card>

                    <button
                        onClick={() => handleGenerateClick()}
                        disabled={isLoading || (!prompt && !uploadedImage)}
                        className="w-full bg-[#9ae99a] text-black border-2 border-black font-bold py-4 px-4 rounded-full hover:bg-[#88d888] transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-300 shadow-[6px_6px_0_0_#000] active:shadow-[2px_2px_0_0_#000] active:translate-x-1 active:translate-y-1"
                    >
                        {isLoading ? 'Generating...' : 'Generate'}
                    </button>
                   
                    {(isLoading || error || generatedImageUrl) && (
                       <div className="mt-8">
                            {renderContent()}
                       </div>
                   )}
                </main>
            </div>
        </div>
    );
};

export default App;