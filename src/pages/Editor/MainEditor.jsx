import React, { useState, useEffect, useRef, useMemo } from "react";
import { db } from "@firebase-config";
import { collection, getDocs } from "firebase/firestore";
import MlmEditPage from "./MlmEditPage";
import GeneralEditPage from "./GenralEditPage";
import FooterSelect from "./utils/FooterSelect";
import TopuplineSelect from "./utils/TopuplineSelect";
import { COLLECTIONS } from "../../collections";
export const GENERAL_SELECT_TYPES = [
  { name: "Trending", value: "Trending" },
  { name: "Festival", value: "Festival" },
  { name: "Motivational", value: "Motivational" },
  { name: "Good Morning", value: "Good_Morning" },
  { name: "Sport", value: "Sport" },
  { name: "Daily_Life", value: "Daily_Life" },
  { name: "Devotional / Spiritual", value: "Devotional_Spiritual" },
  { name: "Leader Quotes", value: "Leader_Quotes" },
  { name: "Health Tips", value: "Health_Tips" },
  // { name: "Anniversary & Birthday", value: "Anniversary_Birthday" },
  { name: "Greeting & Wishes", value: "Greeting_Wishes" },
  {
    name: "Thank You (Birthday & Anniversary)",
    value: "ThankYou_Birthday_Anniversary",
  },
];

const collectionCache = {
  data: null,
  isFetched: false,
};

function groupByGraphicsType(data) {
  return data.reduce((acc, item) => {
    if (!item.Active) return acc;
    const type = item.GraphicsType;
    if (!acc[type]) acc[type] = [];
    acc[type].push(item);
    return acc;
  }, {});
}

function MainEditor() {
  const [collectionData, setCollectionData] = useState(collectionCache.data);
  const [loading, setLoading] = useState(!collectionCache.isFetched);
  const [error, setError] = useState(null);
  const isMounted = useRef(true);

  const [middaleImage, setmiddaleImage] = useState(null);
  useEffect(() => {
    isMounted.current = true;

    if (collectionCache.isFetched) return;

    const fetchMlmGraphics = async () => {
      try {
        setLoading(true);

        const snapshot = await getDocs(collection(db, COLLECTIONS.MLMGRAPHICS));
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        if (isMounted.current) {
          collectionCache.data = data;
          collectionCache.isFetched = true;
          setCollectionData(data);
        }
      } catch (err) {
        if (isMounted.current) setError("Unable to load the editor. Please try again.");
      } finally {
        if (isMounted.current) setLoading(false);
      }
    };

    fetchMlmGraphics();

    return () => {
      isMounted.current = false;
    };
  }, []);

  // ── Grouped map — recomputes only when collectionData changes ─────
  // graphicsMap = { TopUplineFrames: [...], Footers: [...] }
  const graphicsMap = useMemo(
    () => (collectionData ? groupByGraphicsType(collectionData) : {}),
    [collectionData],
  );

  function getSelType() {
    try {
      return JSON.parse(localStorage.getItem("selType")) || {};
    } catch {
      return {};
    }
  }

  const selll = getSelType();

  const isGeneralType = GENERAL_SELECT_TYPES.some(
    (t) => t.value === selll?.type,
  );

  const frames = graphicsMap?.["TopUplineFrames"]?.[0]?.GraphicsLinks || [];
  const [selectedTopFrame, setSelectedTopFrame] = useState(frames[0] || null);
  const [isOpen, setIsOpen] = useState(false);

  const Footersframes = graphicsMap?.["Footers"]?.[0]?.GraphicsLinks || [];
  const [selectedFooterFrame, setSelectedFooterFrame] = useState(
    Footersframes[0] || null,
  );
  const [isOpenFtr, setIsOpenFtr] = useState(false);

  // The editor does not need to wait for optional top/footer graphics. Render
  // it immediately and attach those defaults as soon as their background
  // Firestore request completes.
  useEffect(() => {
    if (!selectedTopFrame && frames.length > 0) {
      setSelectedTopFrame(frames[0]);
    }
  }, [frames, selectedTopFrame]);

  useEffect(() => {
    if (!selectedFooterFrame && Footersframes.length > 0) {
      setSelectedFooterFrame(Footersframes[0]);
    }
  }, [Footersframes, selectedFooterFrame]);

  return (
    <>
      {loading && (
        <div className="fixed top-16 right-3 z-[90] rounded-full bg-background/90 border border-border px-3 py-1.5 text-[11px] font-medium text-muted-foreground shadow-sm backdrop-blur-sm">
          Loading editor tools…
        </div>
      )}
      {error && (
        <div className="fixed top-16 right-3 z-[90] rounded-xl bg-danger/10 border border-danger/20 px-3 py-2 text-[11px] text-danger shadow-sm">
          Optional editor tools could not load.
        </div>
      )}
      {/* {isGeneralType ? ( */}
        <GeneralEditPage
          graphicsMap={graphicsMap}
          frames={frames}
          selectedTopFrame={selectedTopFrame}
          setSelectedTopFrame={setSelectedTopFrame}
          isOpenFtr={isOpenFtr}
          setIsOpenFtr={setIsOpenFtr}
          selectedFooterFrame={selectedFooterFrame}
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          middaleImage={middaleImage}
          setmiddaleImage={setmiddaleImage}
        />
      {/* // ) : (
      //   <MlmEditPage
      //     graphicsMap={graphicsMap}
      //     frames={frames}
      //     selectedTopFrame={selectedTopFrame}
      //     setSelectedTopFrame={setSelectedTopFrame}
      //     isOpenFtr={isOpenFtr}
      //     setIsOpenFtr={setIsOpenFtr}
      //     selectedFooterFrame={selectedFooterFrame}
      //     isOpen={isOpen}
      //     setIsOpen={setIsOpen}
      //     middaleImage={middaleImage}
      //     setmiddaleImage={setmiddaleImage}
      //   />
      // )} */}
      <TopuplineSelect
        frames={frames}
        onFrameSelect={(frame) => setSelectedTopFrame(frame)}
        setIsOpen={setIsOpen}
        isOpen={isOpen}
      />
      <FooterSelect
        isOpenFtr={isOpenFtr}
        setIsOpenFtr={setIsOpenFtr}
        frames={Footersframes}
        setSelectedFooterFrame={setSelectedFooterFrame}
        onFrameSelectFooter={(frame) => setSelectedFooterFrame(frame)}
        selectedFooterFrame={selectedFooterFrame}
      />
    </>
  );
}

export default MainEditor;
