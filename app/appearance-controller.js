const STORAGE_KEY = "kimi-k3:appearance:v1";
const VALID_THEMES = new Set(["system", "light", "dark"]);
const VALID_FONT_SIZES = new Set(["small", "medium", "large"]);

const THEME_LABELS = {
  system: "跟随系统",
  light: "日间",
  dark: "夜间",
};

const FONT_SIZE_LABELS = {
  small: "小字号",
  medium: "中字号",
  large: "大字号",
};

const THEME_COLORS = {
  light: "#f3f4ef",
  dark: "#0f1211",
};

const readPreference = () => {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") || {};
    return {
      theme: VALID_THEMES.has(value.theme) ? value.theme : "system",
      fontSize: VALID_FONT_SIZES.has(value.fontSize) ? value.fontSize : "medium",
    };
  } catch {
    return { theme: "system", fontSize: "medium" };
  }
};

const savePreference = (preference) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preference));
  } catch {
    // The UI remains usable when storage is blocked or unavailable.
  }
};

export const initAppearanceController = ({ control, button, panel, themeColor }) => {
  if (!control || !button || !panel) return null;

  const media = matchMedia("(prefers-color-scheme: dark)");
  const themeButtons = [...panel.querySelectorAll("[data-theme-choice]")];
  const fontSizeButtons = [...panel.querySelectorAll("[data-font-size-choice]")];
  let preference = readPreference();

  const actualTheme = () => (
    preference.theme === "system"
      ? (media.matches ? "dark" : "light")
      : preference.theme
  );

  const updatePressedStates = () => {
    themeButtons.forEach((item) => {
      item.setAttribute("aria-pressed", String(item.dataset.themeChoice === preference.theme));
    });
    fontSizeButtons.forEach((item) => {
      item.setAttribute("aria-pressed", String(item.dataset.fontSizeChoice === preference.fontSize));
    });
  };

  const applyPreference = ({ persist = false } = {}) => {
    const theme = actualTheme();
    const root = document.documentElement;
    root.dataset.themeMode = preference.theme;
    root.dataset.theme = theme;
    root.dataset.fontSize = preference.fontSize;
    root.style.colorScheme = theme;

    if (themeColor) themeColor.content = THEME_COLORS[theme];
    button.title = `显示设置：${THEME_LABELS[preference.theme]} · ${FONT_SIZE_LABELS[preference.fontSize]}`;
    button.setAttribute("aria-label", button.title);
    updatePressedStates();
    if (persist) savePreference(preference);
  };

  const setOpen = (open, { restoreFocus = false } = {}) => {
    panel.hidden = !open;
    button.setAttribute("aria-expanded", String(open));
    control.dataset.open = String(open);
    if (open) {
      panel.querySelector('[aria-pressed="true"]')?.focus();
    } else if (restoreFocus) {
      button.focus();
    }
  };

  const handleChoiceKeys = (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const choices = [...event.currentTarget.parentElement.querySelectorAll("button")];
    const current = choices.indexOf(event.currentTarget);
    let next = current;
    if (event.key === "ArrowLeft") next = (current - 1 + choices.length) % choices.length;
    if (event.key === "ArrowRight") next = (current + 1) % choices.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = choices.length - 1;
    event.preventDefault();
    choices[next].focus();
  };

  button.addEventListener("click", () => setOpen(panel.hidden));

  themeButtons.forEach((item) => {
    item.addEventListener("click", () => {
      preference = { ...preference, theme: item.dataset.themeChoice };
      applyPreference({ persist: true });
    });
    item.addEventListener("keydown", handleChoiceKeys);
  });

  fontSizeButtons.forEach((item) => {
    item.addEventListener("click", () => {
      preference = { ...preference, fontSize: item.dataset.fontSizeChoice };
      applyPreference({ persist: true });
    });
    item.addEventListener("keydown", handleChoiceKeys);
  });

  document.addEventListener("pointerdown", (event) => {
    if (!panel.hidden && !control.contains(event.target)) setOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) {
      event.preventDefault();
      setOpen(false, { restoreFocus: true });
    }
  });

  media.addEventListener("change", () => {
    if (preference.theme === "system") applyPreference();
  });

  applyPreference();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.documentElement.classList.add("appearance-ready");
  }));

  return {
    getPreference: () => ({ ...preference }),
    close: () => setOpen(false),
  };
};
