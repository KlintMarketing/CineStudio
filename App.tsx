
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Video, 
  Settings, 
  History, 
  ChevronRight, 
  Download, 
  Edit3, 
  Play, 
  Layout,
  RefreshCw,
  Image as ImageIcon,
  User,
  MapPin,
  Box,
  Layers,
  Clock,
  Trash2,
  X,
  Key,
  Sparkles,
  ShieldCheck,
  ChevronDown,
  ExternalLink,
  LogOut
} from 'lucide-react';
import { ImageInput, StoryboardShot, ProjectHistory, AppModel } from './types';
import { GeminiService, CategorizedImage } from './services/geminiService';

const App: React.FC = () => {
  const [images, setImages] = useState<ImageInput[]>([
    { id: '1', type: 'character', data: null, name: 'Lead Character' },
    { id: '2', type: 'location', data: null, name: 'Environment' },
    { id: '3', type: 'object', data: null, name: 'Key Prop' },
    { id: '4', type: 'other', data: null, name: 'Style Reference' },
  ]);
  const [prompt, setPrompt] = useState('');
  // Set default to Veo 3 Fast as requested
  const [selectedModel, setSelectedModel] = useState<AppModel>(AppModel.VEO_3_FAST);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<ProjectHistory[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [selectedPreview, setSelectedPreview] = useState<number | null>(null);
  const [isGeneratingFrames, setIsGeneratingFrames] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [currentVideoObject, setCurrentVideoObject] = useState<any>(null);
  const [storyboardEnabled, setStoryboardEnabled] = useState(false);
  const [shots, setShots] = useState<StoryboardShot[]>([
    { id: 's1', prompt: '', duration: 2, image: null }
  ]);
  const [apiKeyReady, setApiKeyReady] = useState(false);
  const [lastFrame, setLastFrame] = useState<string | null>(null);

  useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    if (typeof (window as any).aistudio !== 'undefined') {
      const hasKey = await (window as any).aistudio.hasSelectedApiKey();
      setApiKeyReady(hasKey);
    }
  };

  const handleOpenKeySelector = async () => {
    if (typeof (window as any).aistudio !== 'undefined') {
      await (window as any).aistudio.openSelectKey();
      setApiKeyReady(true);
    }
  };

  const handleImageUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => prev.map(img => img.id === id ? { ...img, data: reader.result as string } : img));
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePaste = useCallback((id: string, e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setImages(prev => prev.map(img => img.id === id ? { ...img, data: reader.result as string } : img));
          };
          reader.readAsDataURL(blob);
        }
      }
    }
  }, []);

  const generateInitialFrames = async () => {
    if (!prompt) return alert('Enter a directorial script.');
    setIsGeneratingFrames(true);
    try {
      const service = new GeminiService();
      const inputImages = images
        .filter(img => img.data)
        .map(img => ({ data: img.data!, mimeType: 'image/png', label: img.name }));
      const frames = await service.generateInitialFrames(prompt, inputImages);
      setPreviews(frames);
    } catch (error) {
      console.error(error);
      alert('Nano Visualization failed.');
    } finally {
      setIsGeneratingFrames(false);
    }
  };

  // Added handleEditFrame to allow for individual storyboard frame refinement.
  // This uses Gemini 2.5 Flash Image to modify the frame based on directorial instructions.
  const handleEditFrame = async (index: number) => {
    const instructions = window.prompt('Refine this frame (e.g., "Change the weather to rainy", "Make it high-contrast"):');
    if (!instructions || !previews[index]) return;

    setIsGeneratingFrames(true);
    try {
      const service = new GeminiService();
      const refinedImage = await service.refineFrame(previews[index], instructions);
      if (refinedImage) {
        setPreviews(prev => {
          const next = [...prev];
          next[index] = refinedImage;
          return next;
        });
      }
    } catch (error) {
      console.error('Frame refinement error:', error);
      alert('Failed to refine frame.');
    } finally {
      setIsGeneratingFrames(false);
    }
  };

  const generateVideo = async () => {
    if (!apiKeyReady) return handleOpenKeySelector();
    if (!prompt) return alert('Directorial script required.');
    setIsGeneratingVideo(true);
    try {
      const service = new GeminiService();
      const startFrame = selectedPreview !== null ? previews[selectedPreview] : undefined;
      const referenceImages = images
        .filter(img => img.data !== null)
        .map(img => ({ data: img.data!, mimeType: 'image/png', label: img.name }));
      const modelToUse = referenceImages.length > 0 ? AppModel.VEO_3_1 : selectedModel;
      const result = await service.generateVideo(modelToUse, prompt, startFrame, referenceImages);
      setGeneratedVideoUrl(result.blobUrl);
      setCurrentVideoObject(result.videoObject);
      setHistory(prev => [{ id: Date.now().toString(), timestamp: Date.now(), mainPrompt: prompt, videoUrl: result.blobUrl, videoObject: result.videoObject, modelUsed: modelToUse, initialFrames: previews }, ...prev]);
    } catch (error: any) {
      console.error(error);
      if (error.message?.includes("Requested entity was not found")) {
        setApiKeyReady(false);
        handleOpenKeySelector();
      } else {
        alert(`Generation failed: ${error.message}`);
      }
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const handleExport = () => {
    if (!generatedVideoUrl) return;
    const a = document.createElement('a');
    a.href = generatedVideoUrl;
    a.download = `CineStudio_${Date.now()}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="min-h-screen flex flex-col gradient-bg text-white selection:bg-blue-500 selection:text-white overflow-hidden">
      {/* Professional Header */}
      <header className="h-20 glass border-b border-white/5 px-8 flex items-center justify-between z-50">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/40">
            <Video className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter uppercase italic leading-none">Cine-Studio</h1>
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-1">Professional Video Suite</p>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-10">
          {['Production', 'Archives', 'Studio Assets'].map(item => (
            <button key={item} className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-white transition-colors">{item}</button>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          {!apiKeyReady ? (
            <button 
              onClick={handleOpenKeySelector}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-900/40"
            >
              Get Started
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-[10px] font-black text-white uppercase tracking-widest">Authorized</div>
                <div className="text-[9px] font-bold text-green-500 uppercase tracking-tighter flex items-center gap-1 justify-end">
                  <ShieldCheck className="w-2.5 h-2.5" /> Studio Session
                </div>
              </div>
              <button 
                onClick={handleOpenKeySelector}
                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all"
              >
                <User className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="flex-grow flex flex-col md:flex-row h-[calc(100vh-80px)]">
        {/* Sidebar */}
        <aside className="w-full md:w-80 glass border-r border-white/10 p-6 overflow-y-auto flex flex-col">
          <div className="space-y-10 flex-grow">
            <section>
              <div className="flex items-center gap-2 mb-4 text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">
                <Settings className="w-3 h-3" />
                <span>Directorial Setup</span>
              </div>
              
              <div className="space-y-3">
                <button 
                  onClick={() => setSelectedModel(AppModel.VEO_3_FAST)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${selectedModel === AppModel.VEO_3_FAST ? 'bg-blue-600/10 border-blue-500/50 text-blue-400' : 'bg-white/5 border-transparent text-gray-500 hover:bg-white/10'}`}
                >
                  <div className="text-left">
                    <div className="text-sm font-bold">Veo 3 Fast</div>
                    <div className="text-[9px] uppercase tracking-widest opacity-60">Speed Optimized</div>
                  </div>
                  {selectedModel === AppModel.VEO_3_FAST && <Sparkles className="w-3.5 h-3.5 animate-pulse text-blue-400" />}
                </button>
                <button 
                  onClick={() => setSelectedModel(AppModel.VEO_3_1)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${selectedModel === AppModel.VEO_3_1 ? 'bg-purple-600/10 border-purple-500/50 text-purple-400' : 'bg-white/5 border-transparent text-gray-500 hover:bg-white/10'}`}
                >
                  <div className="text-left">
                    <div className="text-sm font-bold">Veo 3.1 Pro</div>
                    <div className="text-[9px] uppercase tracking-widest opacity-60">High Fidelity</div>
                  </div>
                  {selectedModel === AppModel.VEO_3_1 && <Sparkles className="w-3.5 h-3.5 animate-pulse text-purple-400" />}
                </button>
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-4 text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">
                <div className="flex items-center gap-2">
                  <Layout className="w-3 h-3" />
                  <span>Production Rules</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={storyboardEnabled} onChange={() => setStoryboardEnabled(!storyboardEnabled)} />
                  <div className="w-8 h-4 bg-white/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              {storyboardEnabled && (
                <div className="space-y-4">
                  {shots.map((shot, idx) => (
                    <div key={shot.id} className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3">
                      <div className="flex justify-between items-center text-left">
                        <span className="text-[9px] font-black text-gray-600 uppercase">Shot {idx + 1}</span>
                        <button onClick={() => setShots(prev => prev.filter(s => s.id !== shot.id))} className="text-gray-700 hover:text-red-500 transition-colors"><Trash2 className="w-3 h-3" /></button>
                      </div>
                      <textarea placeholder="Directorial notes..." className="w-full bg-black/40 text-xs rounded-lg p-3 border border-white/5 h-20 resize-none font-medium" value={shot.prompt} onChange={(e) => setShots(prev => prev.map(s => s.id === shot.id ? { ...s, prompt: e.target.value } : s))} />
                    </div>
                  ))}
                  <button onClick={() => setShots([...shots, { id: Date.now().toString(), prompt: '', duration: 2, image: null }])} className="w-full py-3 bg-white/5 border border-white/5 rounded-xl text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] hover:bg-white/10 transition-colors">Append Shot</button>
                </div>
              )}
            </section>

            <div className="pt-6 border-t border-white/5">
              <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 rounded-xl bg-blue-600/5 border border-blue-500/10 hover:bg-blue-600/10 transition-all group">
                <div>
                  <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Billing Info</div>
                  <div className="text-[8px] text-gray-500 uppercase font-bold mt-1">Paid GCP required</div>
                </div>
                <ExternalLink className="w-3 h-3 text-blue-500 opacity-50 group-hover:opacity-100" />
              </a>
            </div>
          </div>

          <button onClick={() => setShowHistory(true)} className="mt-10 py-4 px-5 flex items-center justify-between rounded-xl bg-white/5 border border-white/5 text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] hover:bg-white/10 transition-all">
            <div className="flex items-center gap-3"><History className="w-4 h-4" /><span>Archives</span></div>
            <span className="bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded-md">{history.length}</span>
          </button>
        </aside>

        {/* Main Workspace */}
        <main className="flex-grow flex flex-col p-8 overflow-y-auto space-y-12">
          {!apiKeyReady ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-lg space-y-10 animate-in fade-in slide-in-from-bottom-10 duration-1000">
                <div className="relative inline-block">
                  <div className="absolute -inset-4 bg-blue-600/20 rounded-full blur-3xl"></div>
                  <Video className="w-20 h-20 text-blue-500 mx-auto relative z-10" />
                </div>
                <div className="space-y-4">
                  <h2 className="text-4xl font-black uppercase tracking-tighter italic">Cinema Starts Here</h2>
                  <p className="text-gray-500 font-medium text-lg">Sign in with your Studio ID to unlock professional identity-mapped video generation.</p>
                </div>
                <button 
                  onClick={handleOpenKeySelector}
                  className="px-12 py-5 bg-blue-600 hover:bg-blue-500 rounded-2xl text-[12px] font-black uppercase tracking-[0.3em] transition-all shadow-2xl shadow-blue-900/60 hover:scale-[1.02]"
                >
                  Authorize Studio Key
                </button>
                <div className="pt-10 flex items-center justify-center gap-10 opacity-30 grayscale hover:grayscale-0 transition-all">
                  <div className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">Powered by <Sparkles className="w-3 h-3" /> Veo 3.1</div>
                  <div className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">Built on <ShieldCheck className="w-3 h-3" /> Google GenAI</div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Asset Section */}
              <section>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-gray-500 flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                    Directorial Assets
                  </h2>
                  <div className="px-3 py-1 rounded-full bg-green-600/10 border border-green-500/20 text-[9px] font-bold text-green-400 uppercase tracking-widest flex items-center gap-2">
                    <ShieldCheck className="w-3 h-3" /> Identity Ready
                  </div>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  {images.map((img) => (
                    <div key={img.id} onPaste={(e) => handlePaste(img.id, e)} className={`group relative aspect-video rounded-3xl transition-all duration-500 border-2 overflow-hidden shadow-2xl ${img.data ? 'border-blue-500/30 ring-1 ring-blue-500/10' : 'border-dashed border-white/5 bg-zinc-950 hover:bg-zinc-900 hover:border-blue-500/30'}`}>
                      {img.data ? (
                        <>
                          <img src={img.data} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-3 backdrop-blur-sm">
                            <button onClick={() => setImages(prev => prev.map(i => i.id === img.id ? { ...i, data: null } : i))} className="p-3 bg-red-600/90 rounded-2xl hover:bg-red-500 transition-all"><Trash2 className="w-5 h-5" /></button>
                          </div>
                        </>
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center space-y-3 cursor-pointer">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border border-white/5 transition-all group-hover:scale-110 ${img.type === 'character' ? 'bg-blue-600/10 text-blue-400' : 'bg-white/5 text-gray-700'}`}>
                            {img.type === 'character' ? <User className="w-5 h-5" /> : img.type === 'location' ? <MapPin className="w-5 h-5" /> : img.type === 'object' ? <Box className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
                          </div>
                          <div className="space-y-1">
                            <div className={`text-[10px] font-black uppercase tracking-widest ${img.type === 'character' ? 'text-blue-400' : 'text-gray-600'}`}>{img.name}</div>
                            <div className="text-[9px] text-gray-800 font-bold uppercase tracking-tighter">Paste or Upload</div>
                          </div>
                          <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleImageUpload(img.id, e)} />
                        </div>
                      )}
                      {img.type === 'character' && img.data && (
                        <div className="absolute top-4 left-4 flex items-center gap-2 bg-blue-600/90 text-[9px] font-black text-white px-3 py-1.5 rounded-full shadow-2xl backdrop-blur-md uppercase tracking-[0.2em] border border-blue-400/30">
                          <Sparkles className="w-3 h-3" /> PROTAGONIST
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {/* Prompt Section */}
              <section className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/30 to-purple-600/30 rounded-[32px] blur-2xl opacity-20 group-hover:opacity-40 transition-all duration-1000"></div>
                <div className="relative">
                  <textarea className="w-full bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-[28px] p-8 text-xl font-medium placeholder-gray-800 focus:outline-none focus:border-blue-500/50 min-h-[180px] resize-none shadow-3xl transition-all" placeholder="Script your cinematic master sequence..." value={prompt} onChange={(e) => setPrompt(e.target.value)} />
                  <div className="absolute bottom-6 right-6 flex items-center gap-4">
                    <button onClick={generateInitialFrames} disabled={isGeneratingFrames} className="flex items-center gap-3 px-8 py-4 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 rounded-2xl text-[10px] font-black transition-all border border-white/5 uppercase tracking-[0.2em] text-gray-400">
                      {isGeneratingFrames ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                      1. Visualize
                    </button>
                    <button onClick={generateVideo} disabled={isGeneratingVideo} className="flex items-center gap-3 px-10 py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-2xl text-[10px] font-black transition-all shadow-2xl shadow-blue-900/50 uppercase tracking-[0.2em]">
                      {isGeneratingVideo ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                      2. Direct Movie
                    </button>
                  </div>
                </div>
              </section>

              {/* Outputs Section */}
              <section className="grid grid-cols-1 lg:grid-cols-2 gap-10 pb-10">
                <div className="space-y-6">
                  <h3 className="text-[10px] font-black text-gray-600 uppercase tracking-[0.4em] flex items-center justify-between">
                    Banana Storyboard
                    <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2">V2.5-Identity</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-5">
                    {previews.length > 0 ? previews.map((src, i) => (
                      <div key={i} className={`group relative aspect-video rounded-3xl overflow-hidden cursor-pointer border-2 transition-all duration-500 ${selectedPreview === i ? 'border-blue-500 scale-[1.05] shadow-[0_0_40px_rgba(59,130,246,0.3)] z-10' : 'border-transparent hover:border-white/20'}`} onClick={() => setSelectedPreview(i)}>
                        <img src={src} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-4">
                          <button onClick={(e) => { e.stopPropagation(); handleEditFrame(i); }} className="p-3 bg-white/10 rounded-2xl hover:bg-white/20 border border-white/10 shadow-2xl"><Edit3 className="w-5 h-5 text-white" /></button>
                        </div>
                      </div>
                    )) : (
                      <div className="col-span-2 aspect-[21/9] rounded-[32px] bg-zinc-950 border border-white/5 flex flex-col items-center justify-center text-zinc-800 space-y-2 text-center">
                        <ImageIcon className="w-8 h-8 opacity-20" />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Ready for visualization</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-[10px] font-black text-gray-600 uppercase tracking-[0.4em] flex items-center justify-between">
                    Veo Master Output
                    <button onClick={() => generatedVideoUrl && setLastFrame(generatedVideoUrl)} className="text-[9px] px-3 py-1 bg-white/5 rounded-lg border border-white/5">Studio View</button>
                  </h3>
                  <div className="relative aspect-video rounded-[32px] bg-black border border-white/10 overflow-hidden shadow-3xl flex items-center justify-center group">
                    {generatedVideoUrl ? (
                      <video src={generatedVideoUrl} controls autoPlay loop className="w-full h-full object-cover shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]" />
                    ) : (
                      <div className="text-center p-10 space-y-6">
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto transition-all duration-700 ${isGeneratingVideo ? 'bg-blue-600/20 border-blue-500 border-[3px] scale-110 shadow-[0_0_30px_rgba(59,130,246,0.5)]' : 'bg-zinc-900 border border-white/5'}`}>
                          <Play className={`w-10 h-10 ${isGeneratingVideo ? 'text-blue-500' : 'text-zinc-800'}`} />
                        </div>
                        <p className="text-[11px] text-gray-800 font-black uppercase tracking-[0.4em] text-center">{isGeneratingVideo ? 'Directing...' : 'Ready to Render'}</p>
                      </div>
                    )}
                    {isGeneratingVideo && (
                      <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-10 space-y-8 animate-in fade-in duration-500">
                        <div className="w-24 h-24 relative">
                          <div className="absolute inset-0 rounded-full border-[4px] border-white/5" />
                          <div className="absolute inset-0 rounded-full border-[4px] border-blue-600 border-t-transparent animate-spin" />
                          <div className="absolute inset-2 rounded-full border-[2px] border-purple-600 border-b-transparent animate-[spin_2s_linear_infinite]" />
                        </div>
                        <div className="text-center space-y-4">
                          <h4 className="text-xl font-black text-white uppercase tracking-[0.3em] italic text-center">Rendering Movie</h4>
                          <div className="max-w-[280px] h-1.5 bg-white/5 rounded-full mx-auto overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-blue-600 to-purple-600 w-1/3 animate-[progress_4s_infinite]" />
                          </div>
                          <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] italic animate-pulse text-center">Baking Identity Mapping (2-4 Min)</p>
                        </div>
                      </div>
                    )}
                  </div>
                  {generatedVideoUrl && !isGeneratingVideo && (
                    <div className="flex items-center gap-5">
                      <button onClick={handleExport} className="w-full py-5 bg-blue-600 hover:bg-blue-500 rounded-2xl text-[10px] font-black flex items-center justify-center gap-3 transition-all shadow-2xl shadow-blue-900/40 uppercase tracking-[0.2em]"><Download className="w-4 h-4" />Export Master</button>
                    </div>
                  )}
                </div>
              </section>
            </>
          )}
        </main>
      </div>

      {/* History Drawer */}
      {showHistory && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowHistory(false)} />
          <div className="relative w-full max-w-md bg-zinc-950 h-full shadow-4xl flex flex-col border-l border-white/10 animate-in slide-in-from-right duration-500">
            <div className="p-8 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-[11px] font-black flex items-center gap-4 uppercase tracking-[0.4em] text-gray-500"><History className="w-4 h-4 text-blue-500" /> Archives</h2>
              <button onClick={() => setShowHistory(false)} className="p-3 hover:bg-white/5 rounded-2xl transition-colors"><X className="w-6 h-6 text-gray-700" /></button>
            </div>
            <div className="flex-grow overflow-y-auto p-6 space-y-6">
              {history.map((item) => (
                <div key={item.id} className="p-5 rounded-[28px] bg-zinc-900/50 border border-white/5 group hover:border-blue-500/30 transition-all cursor-pointer" onClick={() => { setPrompt(item.mainPrompt); setGeneratedVideoUrl(item.videoUrl || null); setCurrentVideoObject(item.videoObject || null); setPreviews(item.initialFrames); setShowHistory(false); }}>
                  <div className="aspect-video rounded-2xl bg-black mb-5 overflow-hidden shadow-2xl">{item.videoUrl && <video src={item.videoUrl} className="w-full h-full object-cover" muted />}</div>
                  <p className="text-xs font-medium text-gray-500 italic line-clamp-2">"{item.mainPrompt}"</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Overlay */}
      {lastFrame && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-black/95 backdrop-blur-3xl animate-in fade-in duration-500" onClick={() => setLastFrame(null)}>
          <div className="relative max-w-6xl w-full aspect-video rounded-[40px] overflow-hidden border border-white/10 shadow-[0_0_150px_rgba(0,0,0,1)]">
            <video src={lastFrame} className="w-full h-full object-cover" controls autoPlay loop />
            <button className="absolute top-10 right-10 p-4 bg-black/50 rounded-full text-white border border-white/10"><X className="w-6 h-6" /></button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  );
};

export default App;
