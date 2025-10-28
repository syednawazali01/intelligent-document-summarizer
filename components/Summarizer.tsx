import React, { useState, useCallback, useRef, useEffect } from 'react';
import { generateSummaries, SummaryMode, extractTextFromFile } from '../services/geminiService';
import { SparklesIcon } from './icons/SparklesIcon';
import Spinner from './ui/Spinner';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { CheckIcon } from './icons/CheckIcon';
import { RefreshIcon } from './icons/RefreshIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { jsPDF } from 'jspdf';
import { ChevronDownIcon } from './icons/ChevronDownIcon';

const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

const Summarizer: React.FC = () => {
  const [files, setFiles] = useState<FileList | null>(null);
  const [originalText, setOriginalText] = useState<string>('');
  const [result, setResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<SummaryMode>('LEGAL');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isDownloadDropdownOpen, setIsDownloadDropdownOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const downloadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (downloadRef.current && !downloadRef.current.contains(event.target as Node)) {
        setIsDownloadDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(e.target.files);
  };

  const handleGenerateSummaries = useCallback(async () => {
    setError(null);
    setResult('');
    setIsLoading(true);

    try {
      let processedTexts: string[] = [];
      
      if (files && files.length > 0) {
        for (const file of Array.from(files)) {
          if (file.type === 'text/plain') {
            const text = await readFileAsText(file);
            processedTexts.push(`--- START OF ${file.name} ---\n${text}\n--- END OF ${file.name} ---`);
          } else if (['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
            const text = await extractTextFromFile(file);
            processedTexts.push(`--- START OF OCR'd ${file.name} ---\n${text}\n--- END OF OCR'd ${file.name} ---`);
          } else {
            // Reject unsupported file types as requested
            throw new Error(`File type for "${file.name}" is not supported. Please use .txt, .pdf, .jpg, or .png.`);
          }
        }
      }

      let combinedOriginalText = processedTexts.join('\n\n');

      if (originalText.trim()) {
        combinedOriginalText = combinedOriginalText
          ? `${combinedOriginalText}\n\n--- USER TEXT ---\n\n${originalText}`
          : originalText;
      }

      if (!combinedOriginalText.trim()) {
        setError('Please provide text or a supported document to summarize.');
        setIsLoading(false);
        return;
      }
      
      const summarizationResult = await generateSummaries(combinedOriginalText, mode);
      setResult(summarizationResult);
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during processing.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [files, originalText, mode]);

  const handleCopy = () => {
    if (!result || isCopied) return;
    navigator.clipboard.writeText(result).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  };

  const handleDownloadTxt = () => {
    if (!result) return;
    setIsDownloadDropdownOpen(false);
    const blob = new Blob([result], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'summary.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const handleDownloadPdf = () => {
    if (!result) return;
    setIsDownloadDropdownOpen(false);
  
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const maxWidth = pageWidth - margin * 2;
    let cursorY = margin;
  
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
  
    const lines = result.split('\n');
  
    lines.forEach(line => {
      if (line.trim() === '') {
        cursorY += 5;
        return;
      }
  
      let isBold = false;
      let textToRender = line;
      const trimmedLine = line.trim();
  
      if (
        trimmedLine.startsWith('**Extractive Summary:**') ||
        trimmedLine.startsWith('**Abstractive Summary:**') ||
        trimmedLine.startsWith('**Main Points:**') ||
        trimmedLine.startsWith('**•')
      ) {
        isBold = true;
        textToRender = textToRender.replace(/\*\*/g, '');
      }
  
      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      const splitText = doc.splitTextToSize(textToRender, maxWidth);
      
      const textHeight = splitText.length * 7;
      if (cursorY + textHeight > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        cursorY = margin;
      }
  
      doc.text(splitText, margin, cursorY);
      cursorY += textHeight;
    });
  
    doc.save('summary.pdf');
  };

  const handleReset = () => {
    setFiles(null);
    setOriginalText('');
    setResult('');
    setError(null);
    setIsLoading(false);
    setIsCopied(false);
    setIsDownloadDropdownOpen(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  return (
    <div className="p-4 md:p-6 h-full flex flex-col md:flex-row gap-6">
      {/* Input Section */}
      <div className="w-full md:w-1/2 flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Select Mode
          </label>
          <div className="flex items-center space-x-2 rounded-lg bg-gray-800 p-1">
            {(['LEGAL', 'FINANCIAL', 'DUAL'] as SummaryMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`w-full text-center px-3 py-1.5 text-sm font-semibold rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                  mode === m ? 'bg-cyan-600 text-white' : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                {m.charAt(0) + m.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-gray-800/50 border border-teal-500/20 rounded-lg p-3 flex items-start gap-3">
            <ShieldCheckIcon className="w-6 h-6 text-teal-400 flex-shrink-0 mt-0.5" />
            <div>
                <h3 className="text-sm font-semibold text-gray-200">Data Safety Notice</h3>
                <p className="text-xs text-gray-400 mt-1">
                    Your documents are processed securely by Google's Generative AI and are not used to train models. All communication is encrypted. 
                    <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline ml-1">Learn More</a>
                </p>
            </div>
        </div>

        <div>
          <label htmlFor="file-upload" className="block text-sm font-medium text-gray-300 mb-2">
            Upload Document(s) (.txt, .pdf, .jpg, .png)
          </label>
          <input
            id="file-upload"
            ref={fileInputRef}
            type="file"
            multiple
            accept=".txt,.pdf,.jpg,.jpeg,.png"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-600 file:text-white hover:file:bg-cyan-700 transition-colors cursor-pointer"
          />
        </div>
        
        <div className="flex flex-col flex-grow">
          <label htmlFor="original-text-input" className="block text-sm font-medium text-gray-300 mb-2">
            Or Paste Text Here
          </label>
          <textarea
            id="original-text-input"
            value={originalText}
            onChange={(e) => setOriginalText(e.target.value)}
            placeholder="Paste the document text here..."
            className="w-full h-full flex-grow p-3 bg-gray-800 border border-gray-700 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-shadow resize-none placeholder:text-gray-500 max-h-[30vh] md:max-h-none"
            rows={10}
          />
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4">
            <button
            onClick={handleGenerateSummaries}
            disabled={isLoading}
            className="w-full sm:flex-grow flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-cyan-600 to-teal-500 text-white font-semibold rounded-md disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-all duration-300 transform hover:-translate-y-0.5 shadow-lg hover:shadow-cyan-500/40"
            >
            {isLoading ? (
                <>
                <Spinner />
                Generating...
                </>
            ) : (
                <>
                <SparklesIcon className="w-5 h-5" />
                Generate Summaries
                </>
            )}
            </button>
            {(result || error) && !isLoading && (
                 <button
                 onClick={handleReset}
                 className="w-full sm:w-auto flex-shrink-0 flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 text-white font-semibold rounded-md hover:bg-gray-700 transition-colors"
               >
                 <RefreshIcon className="w-5 h-5" />
                 Start Over
               </button>
            )}
        </div>
        {error && <p className="text-red-400 text-center">{error}</p>}
      </div>

      {/* Output Section */}
      <div className="w-full md:w-1/2 flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold text-gray-100">Generated Output</h2>
            {result && !isLoading && (
              <div className="flex items-center gap-2">
                 <div className="relative" ref={downloadRef}>
                    <button
                        onClick={() => setIsDownloadDropdownOpen(prev => !prev)}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 bg-gray-700 text-gray-200 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-cyan-500"
                    >
                        <DownloadIcon className="w-4 h-4" />
                        Download
                        <ChevronDownIcon className={`w-3 h-3 transition-transform ${isDownloadDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isDownloadDropdownOpen && (
                        <div className="absolute right-0 top-full mt-2 w-32 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-10 animate-fade-in-fast">
                            <ul className="py-1">
                                <li>
                                    <button onClick={handleDownloadTxt} className="w-full text-left px-4 py-2 text-xs text-gray-200 hover:bg-gray-700 transition-colors">
                                        as .txt
                                    </button>
                                </li>
                                <li>
                                    <button onClick={handleDownloadPdf} className="w-full text-left px-4 py-2 text-xs text-gray-200 hover:bg-gray-700 transition-colors">
                                        as .pdf
                                    </button>
                                </li>
                            </ul>
                        </div>
                    )}
                </div>
                <button
                  onClick={handleCopy}
                  disabled={isCopied}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                    isCopied
                      ? 'bg-green-600 text-white cursor-default'
                      : 'bg-gray-700 text-gray-200 hover:bg-gray-600 focus:ring-cyan-500'
                  }`}
                >
                  {isCopied ? (
                    <>
                      <CheckIcon className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <ClipboardIcon className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
          <div className="flex-grow p-4 bg-gray-800/50 border border-gray-700 rounded-md overflow-y-auto">
            {isLoading && !result && (
              <div className="flex items-center justify-center h-full text-gray-400">
                <p>Processing documents and generating summaries...</p>
              </div>
            )}
            {!isLoading && !result && (
                 <div className="flex items-center justify-center h-full text-gray-500">
                    <p>Your generated summaries will appear here.</p>
                </div>
            )}
            {result && (
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap break-words">
                {result}
              </div>
            )}
          </div>
      </div>
    </div>
  );
};

export default Summarizer;