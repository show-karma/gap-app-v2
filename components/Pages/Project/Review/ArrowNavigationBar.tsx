/* eslint-disable react-hooks/exhaustive-deps */
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/solid";
import { useEffect, useRef, useState } from "react";
import lodash from "lodash";
import { useTheme } from "next-themes";
interface ArrowNavigationBarProps {
  centerID?: string | null;
  skeletonMarkup: JSX.Element;
  barContentMarkup: JSX.Element;
}

enum ScrollDirection {
  LEFT,
  RIGHT,
}

interface ShowNavButtons {
  left: boolean;
  right: boolean;
}

const VISIBLE_SCROLLER_WIDTH_AFTER_NAVIGATOR_CLICK = 75;
const DELAY_FOR_DOM_PROPERTY_UPDATE = 2000;

export const ArrowNavigationBar = ({
  centerID,
  skeletonMarkup,
  barContentMarkup,
}: ArrowNavigationBarProps) => {
  const navigationBarWrapper = useRef<HTMLDivElement | null>(null);
  const { theme } = useTheme();

  const [showNavButtons, setShowNavButtons] = useState<ShowNavButtons | null>(null);

  useEffect(() => {
    setDisplayOfInfiniteShadowsAndNavigationButtons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigationBarWrapper]);

  useEffect(() => {
    if (window) {
      window.addEventListener(
        "resize",
        lodash.debounce(setDisplayOfInfiniteShadowsAndNavigationButtons, 100),
      );
    }

    if (navigationBarWrapper.current) {
      navigationBarWrapper.current.addEventListener(
        "scroll",
        lodash.debounce(setDisplayOfInfiniteShadowsAndNavigationButtons, 100),
      );
    }

    return () => {
      window.removeEventListener(
        "resize",
        lodash.debounce(setDisplayOfInfiniteShadowsAndNavigationButtons, 100),
      );

      navigationBarWrapper.current?.removeEventListener(
        "scroll",
        lodash.debounce(setDisplayOfInfiniteShadowsAndNavigationButtons, 100),
      );
    };
  }, []);

  const scrollQuickJumpScrollerTo = (scrollDirection: ScrollDirection) => {
    if (navigationBarWrapper.current) {
      const amountToScroll =
        navigationBarWrapper.current.clientWidth - VISIBLE_SCROLLER_WIDTH_AFTER_NAVIGATOR_CLICK;

      navigationBarWrapper.current.scroll({
        behavior: "smooth",
        left:
          scrollDirection === ScrollDirection.LEFT
            ? navigationBarWrapper.current.scrollLeft - amountToScroll
            : navigationBarWrapper.current.scrollLeft + amountToScroll,
      });

      setTimeout(setDisplayOfInfiniteShadowsAndNavigationButtons, DELAY_FOR_DOM_PROPERTY_UPDATE);
    }
  };

  const setDisplayOfInfiniteShadowsAndNavigationButtons = () => {
    let showLeft, showRight;

    if (navigationBarWrapper.current) {
      const needsNavigationArrows =
        navigationBarWrapper.current?.scrollWidth > navigationBarWrapper.current?.clientWidth;

      const userScrolledToRight =
        navigationBarWrapper.current?.scrollLeft > 0 && needsNavigationArrows;
      showLeft = userScrolledToRight;
      const scrolledToTheFartest =
        navigationBarWrapper.current?.scrollLeft + navigationBarWrapper.current?.clientWidth ===
        navigationBarWrapper.current?.scrollWidth;
      showRight = !scrolledToTheFartest && needsNavigationArrows;

      setShowNavButtons({
        left: showLeft,
        right: showRight,
      });
    }
  };

  useEffect(() => {
    if (centerID) {
      const centerElement = document.querySelector(
        '[data-navigation-item="' + centerID + '"]',
      ) as HTMLElement;

      if (centerElement && navigationBarWrapper.current) {
        navigationBarWrapper.current.scrollTo({
          behavior: "smooth",
          left: centerElement.offsetLeft - 80,
        });

        setTimeout(setDisplayOfInfiniteShadowsAndNavigationButtons, DELAY_FOR_DOM_PROPERTY_UPDATE);
      }
    }
  }, [centerID]);

  return (
    <div className={`relative flex ${showNavButtons !== null ? "space-x-1 z-20 " : ""}`}>
      <div className={`z-20 opacity-0 transition ${showNavButtons?.left ? "!opacity-100" : ""}`}>
        <div
          className={`pointer-events-none flex items-center absolute top-0 w-20 h-full z-20 rotate-180 transform transition ${
            theme === "light" ? "gradient-white-to-transparent" : "gradient-black-to-transparent"
          }`}
        />
        <button
          className="border-transparent border-2 -mt-0.5 hover:border-gray-200 hover:bg-gray-100 rounded-full p-1.5 opacity-100 transition absolute z-30 top-1/2 left-1 transform -translate-x-1/2 -translate-y-1/2"
          onClick={() => scrollQuickJumpScrollerTo(ScrollDirection.LEFT)}
        >
          <ChevronLeftIcon className="w-4 h-4 font-black dark:text-white text-black" />
        </button>
      </div>
      <div
        ref={navigationBarWrapper}
        className="z-10 w-full scrollbar-hide overflow-x-scroll no-scrollbar"
      >
        {showNavButtons === null && skeletonMarkup}
        {<div className={showNavButtons === null ? "opacity-0" : ""}>{barContentMarkup}</div>}
      </div>
      <div className={`z-20 opacity-0 transition ${showNavButtons?.right ? "!opacity-100" : ""}`}>
        <div
          className={`pointer-events-none flex items-center absolute right-0 top-0 w-20 h-full z-20 transition  ${
            theme === "light" ? "gradient-white-to-transparent" : "gradient-black-to-transparent"
          }`}
        />
        <button
          onClick={() => scrollQuickJumpScrollerTo(ScrollDirection.RIGHT)}
          className="border-transparent border-2 -mt-0.5 hover:border-gray-200 hover:bg-gray-100 rounded-full p-1.5 opacity-100 transition absolute z-30 top-1/2 right-1 transform -translate-x-1/2 -translate-y-1/2"
        >
          <ChevronRightIcon className="w-4 h-4 text-black dark:text-white font-black" />
        </button>
      </div>
    </div>
  );
};
