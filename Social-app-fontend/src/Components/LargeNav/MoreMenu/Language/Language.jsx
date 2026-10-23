import React, { useEffect, useState } from "react";
import vn from "../../../../assets/navlogo/VN.png";
import en from "../../../../assets/navlogo/GB.png";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { changeLanguageRedux } from "../../../../Redux/Reducer/appReducer";

const languages = {
  vi: { label: "Tiếng Việt", icon: vn },
  en: { label: "English", icon: en },
};

const Language = ({ dark = false }) => {
  const { i18n } = useTranslation();
  const dispatch = useDispatch();
  const languageRedux = useSelector((state) => state.app.language) || "vi";

  const [showDropdown, setShowDropdown] = useState(false);

  const styles = dark
    ? {
        chip: "bg-ig-surface hover:bg-ig-ground",
        label: "text-ig-text",
        menu: "border-ig-border bg-ig-raised",
        item: "text-ig-text hover:bg-ig-surface",
        selected: "bg-ig-surface",
      }
    : {
        chip: "bg-ig-surface",
        label: "text-ig-text",
        menu: "border-ig-border bg-ig-raised",
        item: "text-ig-text hover:bg-ig-surface",
        selected: "bg-ig-surface",
      };

  useEffect(() => {
    i18n.changeLanguage(languageRedux);
  }, [languageRedux, i18n]);

  const changeLanguageApp = (lang) => {
    dispatch(changeLanguageRedux(lang));
    setShowDropdown(false);
  };

  const currentLang = languages[languageRedux] || languages.vi;

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowDropdown(true)}
      onMouseLeave={() => setShowDropdown(false)}
    >
      <button
        type="button"
        onClick={() => setShowDropdown((prev) => !prev)}
        aria-expanded={showDropdown}
        className={`flex w-full items-center gap-2 rounded-lg p-2 text-left ${styles.chip}`}
      >
        <img
          src={currentLang.icon}
          className="h-5 w-5"
          alt={languageRedux}
        />
        <span className={`text-[14px] font-medium ${styles.label}`}>
          {currentLang.label}
        </span>
      </button>

      {showDropdown && (
        <ul
          className={`absolute left-0 top-full z-20 mt-1 w-40 rounded-lg border p-1 shadow-lg ${styles.menu}`}
        >
          {Object.entries(languages).map(([key, { label, icon }]) => (
            <li key={key}>
              <button
                type="button"
                className={`flex w-full items-center gap-2 rounded-md p-2 text-left text-[14px] ${
                  styles.item
                } ${languageRedux === key ? styles.selected : ""}`}
                onClick={() => changeLanguageApp(key)}
              >
                <img src={icon} className="h-5 w-5" alt={key} />
                {label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Language;
