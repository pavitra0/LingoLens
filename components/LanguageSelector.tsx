"use client";

import { useState, useRef, useEffect } from "react";
import {
  SUPPORTED_LANGUAGES,
  REGIONS,
  getLanguageByCode,
  type Language,
} from "@/lib/languages";
import { Check, ChevronDown, Globe, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface LanguageSelectorProps {
  sourceLanguage?: string;
  selectedLanguage?: string | null;
  onLanguageChange: (language: string | null) => void;
  disabled?: boolean;
}

export default function LanguageSelector({
  sourceLanguage,
  selectedLanguage: selectedLanguageProp,
  onLanguageChange,
  disabled = false,
}: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(
    selectedLanguageProp || null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [activeRegion, setActiveRegion] = useState<string | null | undefined>(undefined);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredLanguages = searchQuery
    ? SUPPORTED_LANGUAGES.filter(
      (lang) =>
        lang.code !== sourceLanguage &&
        (lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          lang.nativeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          lang.code.toLowerCase().includes(searchQuery.toLowerCase())),
    )
    : [];

  const languagesByRegion = REGIONS.reduce(
    (acc, region) => {
      const languages = SUPPORTED_LANGUAGES.filter(
        (lang) => lang.region === region && lang.code !== sourceLanguage,
      );
      if (languages.length > 0) {
        acc[region] = languages;
      }
      return acc;
    },
    {} as Record<string, Language[]>,
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && Object.keys(languagesByRegion).length > 0 && activeRegion === undefined) {
      setActiveRegion(Object.keys(languagesByRegion)[0]);
    }
  }, [isOpen, languagesByRegion, activeRegion]);

  const handleSelect = (languageCode: string | null) => {
    setSelectedLanguage(languageCode);
    setIsOpen(false);
    setSearchQuery("");
    onLanguageChange(languageCode);
  };

  useEffect(() => {
    setSelectedLanguage(selectedLanguageProp || null);
  }, [selectedLanguageProp]);

  const getSelectedDisplayText = () => {
    if (!selectedLanguage) return "Select Language";
    const lang = getLanguageByCode(selectedLanguage);
    return lang ? lang.name : "Select Language";
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 text-sm font-medium transition-all duration-200 rounded-full border shadow-sm",
          "bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/20 text-foreground",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          isOpen && "ring-2 ring-primary/20 border-primary/50"
        )}
      >
        <Globe className="w-4 h-4 text-primary/80" />
        <span className="truncate max-w-[100px]">{getSelectedDisplayText()}</span>
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-[500px] h-[400px] bg-background/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right ring-1 ring-border/10">

          {/* Header & Search */}
          <div className="p-3 border-b border-border/50 flex-none bg-muted/30">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search languages..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setActiveRegion(null);
                }}
                className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-border/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all placeholder:text-muted-foreground/60"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 hover:text-foreground text-muted-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Sidebar Regions */}
            {!searchQuery && (
              <div className="w-32 border-r border-border/50 flex flex-col overflow-y-auto bg-muted/20 py-2">
                <button
                  onClick={() => setActiveRegion(null)}
                  className={cn(
                    "px-4 py-2 text-xs font-medium text-left transition-colors relative",
                    !activeRegion ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  All Regions
                  {!activeRegion && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary" />}
                </button>
                <div className="my-1 border-b border-border/30 mx-3" />
                {Object.keys(languagesByRegion).map((region) => (
                  <button
                    key={region}
                    onClick={() => setActiveRegion(region)}
                    className={cn(
                      "px-4 py-2 text-xs font-medium text-left transition-colors relative",
                      activeRegion === region ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    {region}
                    {activeRegion === region && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary" />}
                  </button>
                ))}
              </div>
            )}

            {/* Language List */}
            <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
              {searchQuery ? (
                // Search Results
                filteredLanguages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                    <Search className="w-8 h-8 opacity-20" />
                    <p className="text-sm">No languages found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-1 p-1">
                    {filteredLanguages.map((lang) => (
                      <LanguageButton
                        key={lang.code}
                        lang={lang}
                        isSelected={selectedLanguage === lang.code}
                        onClick={() => handleSelect(lang.code)}
                      />
                    ))}
                  </div>
                )
              ) : activeRegion ? (
                // Filtered by Region
                <div className="grid grid-cols-2 gap-1 p-1">
                  {languagesByRegion[activeRegion]?.map((lang) => (
                    <LanguageButton
                      key={lang.code}
                      lang={lang}
                      isSelected={selectedLanguage === lang.code}
                      onClick={() => handleSelect(lang.code)}
                    />
                  ))}
                </div>
              ) : (
                // All Languages (Default View)
                <div className="space-y-4 p-1">
                  {/* Original Option */}
                  <button
                    onClick={() => handleSelect(null)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-all border border-transparent",
                      selectedLanguage === null
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "hover:bg-muted text-foreground"
                    )}
                  >
                    <span className="font-medium">Original Language</span>
                    {selectedLanguage === null && <Check className="w-4 h-4 ml-2" />}
                  </button>

                  <div className="grid grid-cols-2 gap-1">
                    {SUPPORTED_LANGUAGES.filter(l => !sourceLanguage || l.code !== sourceLanguage).map((lang) => (
                      <LanguageButton
                        key={lang.code}
                        lang={lang}
                        isSelected={selectedLanguage === lang.code}
                        onClick={() => handleSelect(lang.code)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-border/50 bg-muted/30 text-[10px] text-center text-muted-foreground">
            Powered by Lingo.dev
          </div>
        </div>
      )}
    </div>
  );
}

function LanguageButton({ lang, isSelected, onClick }: { lang: Language, isSelected: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all text-left border border-transparent group",
        isSelected
          ? "bg-primary/10 text-primary border-primary/20 shadow-sm"
          : "hover:bg-muted text-muted-foreground hover:text-foreground"
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{lang.nativeName}</div>
        <div className="text-[10px] opacity-70 truncate">{lang.name}</div>
      </div>
      {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
    </button>
  )
}
