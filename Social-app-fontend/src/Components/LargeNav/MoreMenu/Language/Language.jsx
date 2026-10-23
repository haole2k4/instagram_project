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
  const languageRedux = useSelector((state) => state.app.language);

  const [showDropdown, setShowDropdown] = useState(false);

  const styles = dark
    ? {
        chip: "bg-ig-surface",
        label: "text-ig-text",
        menu: "border-ig-border bg-ig-raised",
        item: "text-ig-text hover:bg-ig-surface",
        selected: "bg-ig-surface",
      }
    : {
        chip: "bg-gray-100",
        label: "",
        menu: "border bg-white",
        item: "hover:bg-gray-200",
        selected: "bg-gray-300",
      };

  useEffect(() => {
    i18n.changeLanguage(languageRedux);
  }, [languageRedux, i18n]);

  const changeLanguageApp = (lang) => {
    dispatch(changeLanguageRedux(lang));
    setShowDropdown(false); // Ẩn dropdown sau khi chọn
  };

  return (
    <div
      className="relative cursor-pointer"
      onMouseEnter={() => setShowDropdown(true)}
      onMouseLeave={() => setShowDropdown(false)}
    >
      {/* Hiển thị ngôn ngữ hiện tại */}
      <div className={`flex items-center gap-2 rounded-lg p-2 ${styles.chip}`}>
        <img
          src={languages[languageRedux].icon}
          className="w-5 h-5"
          alt={languageRedux}
        />
        <span className={`text-sm font-medium ${styles.label}`}>
          {languages[languageRedux].label}
        </span>
      </div>

      {/* Dropdown chọn ngôn ngữ */}
      {showDropdown && (
        <ul
          className={`absolute left-0 top-full z-10 mt-1 w-36 rounded-lg border shadow-lg ${styles.menu}`}
        >
          {Object.entries(languages).map(([key, { label, icon }]) => (
            <li
              key={key}
              className={`flex cursor-pointer items-center gap-2 p-2 ${styles.item} ${
                languageRedux === key ? styles.selected : ""
              }`}
              onClick={() => changeLanguageApp(key)}
            >
              <img src={icon} className="w-5 h-5" alt={key} />
              {label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Language;
