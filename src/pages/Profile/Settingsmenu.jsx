import { useState } from "react";
import { useGeneralData } from "../../Context/GeneralContext";
import { useLocation, useNavigate } from "react-router";
import ChangePin from "./utils/ChangePin";
import DeleteAcc from "./utils/DeleteAcc";
import {
  BANNER_SETTINGS_PATH,
  createBannerSettingsNavigationState,
} from "../../utils/bannerSettingsNavigation";

/* ── Inline SVG Icon ──────────────────────────────────────────── */
const Icon = ({ d, size = 17, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {Array.isArray(d)
      ? d.map((path, i) => <path key={i} d={path} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />)
      : <path d={d} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />}
  </svg>
);

const MoonIcon       = () => <Icon d={["M13.5 9.5A5.5 5.5 0 0 1 6.5 2.5a5.5 5.5 0 1 0 7 7Z"]} />;
const GearIcon       = () => <Icon d={["M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z","M13.196 6A5.977 5.977 0 0 0 12.5 4.928l-.768.768a.75.75 0 0 1-1.06-1.06l.768-.769A6 6 0 0 0 6 3.804V4.5a.75.75 0 0 1-1.5 0v-.696A6 6 0 0 0 3.804 4.5l.768.768a.75.75 0 1 1-1.06 1.06l-.769-.768A5.977 5.977 0 0 0 1.5 10h.696a.75.75 0 0 1 0 1.5H1.5a5.977 5.977 0 0 0 .696 2 5.977 5.977 0 0 0 1.072.696l.768-.768a.75.75 0 1 1 1.06 1.06l-.768.769A6 6 0 0 0 9.5 15.196V14.5a.75.75 0 0 1 1.5 0v.696a5.977 5.977 0 0 0 1.196-1.072l-.768-.768a.75.75 0 1 1 1.06-1.06l.769.768A5.977 5.977 0 0 0 14.5 10h-.696a.75.75 0 0 1 0-1.5h.696A5.977 5.977 0 0 0 13.196 6Z"]} />;
const CircleQIcon    = () => <Icon d={["M8 14.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Z","M6.25 6.25a1.75 1.75 0 0 1 3.25.875C9.5 8.5 8 8.75 8 10","M8 12h.01"]} />;
const PersonIcon     = () => <Icon d={["M8 7.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z","M2.5 13.5a5.5 5.5 0 0 1 11 0"]} />;
const CommentIcon    = () => <Icon d={["M2 3.5A1.5 1.5 0 0 1 3.5 2h9A1.5 1.5 0 0 1 14 3.5v7A1.5 1.5 0 0 1 12.5 12H8l-3.5 2.5V12H3.5A1.5 1.5 0 0 1 2 10.5v-7Z"]} />;
const KeyIcon        = () => <Icon d={["M5.5 9.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z","M8.5 7.5 14 13","M12 11.5l1.5 1.5-1 1","M13.5 13l1.5 1.5"]} />;
const PersonXIcon    = () => <Icon d={["M7 7.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z","M1.5 13.5a5.502 5.502 0 0 1 8.536-4.579","M11 12l2 2m0 0 2 2m-2-2 2-2m-2 2-2 2"]} />;
const StarIcon       = () => <Icon d={["m8 1.5 1.945 3.942 4.348.633-3.146 3.066.743 4.33L8 11.355l-3.89 2.116.743-4.33L1.707 6.075l4.348-.633L8 1.5Z"]} />;
const ShieldIcon     = () => <Icon d={["M8 1.5 2 4v4c0 3.314 2.686 6 6 6s6-2.686 6-6V4L8 1.5Z","M5.5 8l1.75 1.75L10.5 6"]} />;
const FileTextIcon   = () => <Icon d={["M9.5 1.5H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6L9.5 1.5Z","M9.5 1.5V6H13","M5.5 9h5M5.5 11.5h3"]} />;
const ChevronRight   = () => <Icon d="M6 3.5 10.5 8 6 12.5" size={14} className="text-muted-foreground/50" />;

/* ── Toggle ──────────────────────────────────────────────────── */
const Toggle = ({ checked, onChange }) => (
  <button
    role="switch"
    aria-checked={checked}
    onClick={onChange}
    className={`relative inline-flex h-[26px] w-[46px] items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${checked ? "bg-accent" : "bg-foreground/15"}`}
  >
    <span
      className={`inline-block h-[20px] w-[20px] rounded-full bg-white shadow transition-transform duration-200 ${checked ? "translate-x-[22px]" : "translate-x-[3px]"}`}
    />
  </button>
);

/* ── Section Header ──────────────────────────────────────────── */
const SectionHeader = ({ title }) => (
  <div className="px-4 pt-5 pb-2">
    <span className="text-[10.5px] font-bold tracking-widest text-muted-foreground uppercase">{title}</span>
  </div>
);

/* ── Divider ─────────────────────────────────────────────────── */
const Divider = () => <div className="mx-4 h-px bg-border" />;

/* ── Menu Row ────────────────────────────────────────────────── */
const MenuRow = ({ icon: IconComp, label, rightContent, showArrow = true, danger = false, onClick }) => (
  <button
    onClick={onClick}
    className={`flex w-full items-center gap-3 px-4 py-[13px] transition-colors hover:bg-foreground/[0.04] active:bg-foreground/[0.07] focus:outline-none text-left group rounded-xl ${danger ? "text-danger" : "text-foreground"}`}
  >
    <span className={`flex-shrink-0 ${danger ? "text-danger" : "text-muted-foreground"}`}>
      <IconComp />
    </span>
    <span className={`flex-1 text-[14px] font-medium ${danger ? "text-danger" : "text-foreground"}`}>
      {label}
    </span>
    {rightContent && (
      <span className="ml-auto flex items-center gap-2">{rightContent}</span>
    )}
    {showArrow && !rightContent && <ChevronRight />}
  </button>
);

/* ── Main Component ──────────────────────────────────────────── */
export default function SettingsMenu() {
  const [invShow, setInvShow]     = useState(false);
  const [chngePin, setChngePin]   = useState(false);
  const [deleteAcc, setDeleteAcc] = useState(false);
  const navigate                  = useNavigate();
  const location                  = useLocation();
  const { theme, toggleTheme }    = useGeneralData();
  const isDark                    = theme === "dark";

  return (
    <>
      <ChangePin show={chngePin}   setChngePin={setChngePin}   />
      <DeleteAcc show={deleteAcc}  setDeleteAcc={setDeleteAcc} />

      <div className="w-full bg-background rounded-2xl overflow-hidden">
        {/* ── PREFERENCES ── */}
        <SectionHeader title="Preferences" />
        <MenuRow
          icon={MoonIcon}
          label="Dark Mode"
          showArrow={false}
          rightContent={<Toggle checked={isDark} onChange={toggleTheme} />}
        />

        {/* ── SETTINGS & SUPPORT ── */}
        <SectionHeader title="Settings & Support" />
        <MenuRow
          onClick={() =>
            navigate(BANNER_SETTINGS_PATH, {
              state: createBannerSettingsNavigationState(location),
            })
          }
          icon={GearIcon}
          label="Banner Settings"
        />
        <Divider />
        <MenuRow onClick={() => window.open("https://youtube.com/@mlmboosterapp?si=4AQiHvcR8x6CmOHX","_blank")} icon={CircleQIcon}  label="Learn How to Use App" />
        <Divider />
        <MenuRow onClick={() => window.open("tel:+919341947815")}                 icon={PersonIcon}   label="Customer Care" />
        <Divider />
        <MenuRow onClick={() => window.open("https://wa.me/919341947815","_blank")} icon={CommentIcon} label="Chat with an Expert" />

        {/* ── SECURITY ── */}
        <SectionHeader title="Security" />
        <MenuRow onClick={() => setChngePin(true)}  icon={KeyIcon}    label="Change PIN" />
        <Divider />
        <MenuRow onClick={() => setDeleteAcc(true)} icon={PersonXIcon} label="Delete My Account" danger />

        {/* ── ABOUT ── */}
        <SectionHeader title="About" />
        <MenuRow icon={StarIcon}    label="Feedback & Review" onClick={() => window.open("https://play.google.com/store","_blank")} />
        <Divider />
        <MenuRow icon={ShieldIcon}  label="Privacy Policy"   onClick={() => window.open("https://mlmlive.in/Privacy.html","_blank")} />
        <Divider />
        <MenuRow icon={FileTextIcon} label="Terms & Conditions" onClick={() => window.open("https://mlmlive.in/Term.html","_blank")} />

        <div className="h-3" />
      </div>
    </>
  );
}
