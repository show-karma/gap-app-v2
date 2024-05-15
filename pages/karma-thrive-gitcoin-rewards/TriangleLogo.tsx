import React from "react";

const TriangleLogo = () => {
  return (
    <div className="flex justify-center  w-full mb-5">
      <div className="relative w-[450px] h-[350px]">
        {/* SVG for Dotted Lines */}
        <div className="absolute top-0 left-0 w-full h-full z-0">
          <svg className="w-full h-full" viewBox="0 0 100 100">
            <line
              x1="50"
              y1="0"
              x2="0"
              y2="86.6"
              stroke="gray"
              strokeDasharray="4 2"
              strokeWidth="1"
            />
            <line
              x1="50"
              y1="0"
              x2="100"
              y2="86.6"
              stroke="gray"
              strokeDasharray="4 2"
              strokeWidth="1"
            />
            <line
              x1="0"
              y1="86.6"
              x2="100"
              y2="86.6"
              stroke="gray"
              strokeDasharray="4 2"
              strokeWidth="1"
            />
          </svg>
        </div>

        {/* Top logo */}
        <div className="flex justify-center absolute top-0 left-1/2 transform -translate-x-1/2 z-2">
          <img
            src="/logos/gitcoin_200x200.jpeg"
            alt="Logo 1"
            className="w-36 h-36 rounded-full"
          />
        </div>
        {/* Bottom-left logo */}
        <div className="flex gap-7">
          <div className="flex justify-center absolute bottom-0 left-[-20px] transform translate-x-1/9 translate-y-1/4 z-2">
            <img
              src="/logo/logo-dark.png"
              alt="Logo 2"
              className="w-36 h-36 rounded-full bg-black"
            />
          </div>
          {/* Bottom-right logo */}
          <div className="flex justify-center absolute bottom-0 right-[-20px] transform -translate-x-1/8 translate-y-1/4 z-2">
            <img
              src="/logos/thrivelogo.png"
              alt="Logo 3"
              className="w-36 h-36 rounded-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TriangleLogo;
