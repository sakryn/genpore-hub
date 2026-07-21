/**
 * UI STRINGS — English and Spanish
 *
 * Every piece of user-facing text lives here. If you are about to type a
 * visible string directly into a component, put it here instead.
 *
 * The admin dashboard is intentionally NOT translated — it is an internal tool
 * for a small number of people, and translating it doubles the surface for no
 * real benefit. Only the login, language picker, and learner dashboard are
 * bilingual.
 */

export const STRINGS = {
  en: {
    // Login
    login_title: 'Training Portal',
    login_subtitle: 'Enter your passcode to continue.',
    login_passcode: 'Passcode',
    login_button: 'Sign in',
    login_error: 'That passcode was not recognized.',
    login_generic_error: 'Something went wrong. Please try again.',
    login_working: 'Signing in…',

    // Language picker
    lang_title: 'Choose your language',
    lang_subtitle: 'You can change this at any time.',
    lang_english: 'English',
    lang_spanish: 'Español',
    lang_continue: 'Continue',

    // Dashboard
    dash_title: 'Training Modules',
    dash_subtitle: 'Watch each video, then mark it complete.',
    dash_progress: (done, total) => `${done} of ${total} complete`,
    dash_completed: 'Completed',
    dash_not_started: 'Not started',
    dash_watch: 'Watch',
    dash_rewatch: 'Watch again',
    dash_back: 'Back to modules',
    dash_complete_button: 'Mark as complete',
    dash_complete_locked: 'Finish the video to mark it complete',
    dash_completed_badge: 'Complete',
    dash_completed_times: (n) => (n === 1 ? 'Completed once' : `Completed ${n} times`),
    dash_signout: 'Sign out',
    dash_admin: 'Admin Dashboard',
    dash_loading: 'Loading…',

    // Language toggle
    toggle_label: 'Language',
  },

  es: {
    // Login
    login_title: 'Portal de Capacitación',
    login_subtitle: 'Ingrese su código de acceso para continuar.',
    login_passcode: 'Código de acceso',
    login_button: 'Iniciar sesión',
    login_error: 'No se reconoció ese código de acceso.',
    login_generic_error: 'Algo salió mal. Inténtelo de nuevo.',
    login_working: 'Iniciando sesión…',

    // Language picker
    lang_title: 'Elija su idioma',
    lang_subtitle: 'Puede cambiarlo en cualquier momento.',
    lang_english: 'English',
    lang_spanish: 'Español',
    lang_continue: 'Continuar',

    // Dashboard
    dash_title: 'Módulos de Capacitación',
    dash_subtitle: 'Vea cada video y luego márquelo como completado.',
    dash_progress: (done, total) => `${done} de ${total} completados`,
    dash_completed: 'Completado',
    dash_not_started: 'Sin comenzar',
    dash_watch: 'Ver',
    dash_rewatch: 'Ver de nuevo',
    dash_back: 'Volver a los módulos',
    dash_complete_button: 'Marcar como completado',
    dash_complete_locked: 'Termine el video para marcarlo como completado',
    dash_completed_badge: 'Completado',
    dash_completed_times: (n) => (n === 1 ? 'Completado una vez' : `Completado ${n} veces`),
    dash_signout: 'Cerrar sesión',
    dash_admin: 'Panel de administración',
    dash_loading: 'Cargando…',

    // Language toggle
    toggle_label: 'Idioma',
  },
};

/** Returns the string table for a language, defaulting to English. */
export function t(lang) {
  return STRINGS[lang] || STRINGS.en;
}

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
];

export default STRINGS;
