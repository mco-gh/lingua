import React from 'react';
import type { LanguageOption } from '../types';

interface LanguageSelectorProps {
  languages: LanguageOption[];
  selectedLanguage: string;
  onSelectLanguage: (languageCode: string) => void;
  disabled: boolean;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ languages, selectedLanguage, onSelectLanguage, disabled }) => {
  return (
    <div className="flex flex-col items-center">
      <label htmlFor="language-select" className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
        Language to Practice
      </label>
      <select
        id="language-select"
        value={selectedLanguage}
        onChange={(e) => onSelectLanguage(e.target.value)}
        disabled={disabled}
        className="bg-gray-100 border border-gray-300 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full max-w-xs p-2.5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.name}>
            {lang.emoji} {lang.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default LanguageSelector;