"use client";

import { useState, useRef, useEffect } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/solid";
import debounce from "lodash.debounce";
import { ISearchResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { cn } from "@/utilities/tailwind";
import { groupSimilarCommunities } from "@/utilities/communityHelpers";
import { PAGES } from "@/utilities/pages";
import { ProfilePicture } from "@/components/Utilities/ProfilePicture";
import { ScrollArea } from "@/components/ui/scroll-area";

export function NavbarSearch() {
    const [results, setResults] = useState<ISearchResponse>({
        communities: [],
        projects: [],
    });
    const [isSearchListOpen, setIsSearchListOpen] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [searchValue, setSearchValue] = useState<string>("");
    const searchRef = useRef<HTMLDivElement>(null);

    // Click outside to close search
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsSearchListOpen(false);
            }
        };

        if (isSearchListOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isSearchListOpen]);

    const debouncedSearch = debounce(async (value: string) => {
        if (value.length < 3) {
            setResults({ communities: [], projects: [] });
            setIsSearchListOpen(false);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setIsSearchListOpen(true);
        try {
            const result = await gapIndexerApi.search(value);
            setResults(result.data);
        } catch (error) {
            console.error("Search error:", error);
            setResults({ communities: [], projects: [] });
        } finally {
            setIsLoading(false);
        }
    }, 500);

    const handleInputChange = (value: string) => {
        setSearchValue(value);
        debouncedSearch(value);
    };

    const handleSelectItem = () => {
        setIsSearchListOpen(false);
        setSearchValue("");
        setResults({ communities: [], projects: [] });
    };

    const groupedCommunities = groupSimilarCommunities(results.communities);
    const totalResults = results.projects.length + groupedCommunities.length;

    return (
        <div className="relative max-w-full lg:max-w-[200px]" ref={searchRef}>
            <div className="relative flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-md min-w-[100px] bg-background">
                <MagnifyingGlassIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <input
                    type="text"
                    placeholder="Search"
                    className="w-full flex-1 text-sm bg-transparent text-foreground placeholder:text-muted-foreground border-none outline-none focus:ring-0 p-0"
                    value={searchValue}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onFocus={() => {
                        if (totalResults > 0) {
                            setIsSearchListOpen(true);
                        }
                    }}
                />
                <Loader2 className={cn(
                    "w-4 h-4 flex-shrink-0 transition-opacity",
                    isLoading
                        ? "opacity-100 animate-spin text-muted-foreground"
                        : "opacity-0"
                )} />
            </div>

            {isSearchListOpen && (
                <div className="absolute top-full left-0 mt-2 w-[400px] bg-background border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-6">
                            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                        </div>
                    ) : totalResults === 0 && searchValue.length >= 3 ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                            No results found.
                        </div>
                    ) : (
                        <ScrollArea className="h-[280px] w-[400px]">
                            <div className="flex flex-col gap-1 py-3 pr-3">
                                {groupedCommunities.map((community) => {
                                    const name = community.details?.data?.name || "Untitled Community";
                                    const imageURL = community.details?.data?.imageURL;
                                    const slug = community.details?.data?.slug || community.uid;

                                    return (
                                        <Link
                                            key={community.uid}
                                            href={PAGES.COMMUNITY.ALL_GRANTS(slug)}
                                            onClick={handleSelectItem}
                                            className="flex items-center gap-2 mx-3 px-3 py-2 rounded-md hover:bg-accent transition-colors"
                                        >
                                            <ProfilePicture
                                                imageURL={imageURL}
                                                name={community.uid || ""}
                                                className="w-8 h-8 flex-shrink-0"
                                                alt={name}
                                            />
                                            <span className="font-medium text-foreground truncate block" style={{ maxWidth: '200px' }}>
                                                {name}
                                            </span>
                                            <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 text-xs font-medium rounded flex-shrink-0 whitespace-nowrap ml-auto">
                                                Community
                                            </span>
                                        </Link>
                                    );
                                })}
                                {results.projects.map((project) => {
                                    const title = project.details?.data?.title || "Untitled Project";
                                    const imageURL = project.details?.data?.imageURL;
                                    const slug = project.details?.data?.slug || project.uid;

                                    return (
                                        <Link
                                            key={project.uid}
                                            href={PAGES.PROJECT.GRANTS(slug)}
                                            onClick={handleSelectItem}
                                            className="flex items-center gap-2 mx-3 px-3 py-2 rounded-md hover:bg-accent transition-colors"
                                        >
                                            <ProfilePicture
                                                imageURL={imageURL}
                                                name={project.uid || ""}
                                                className="w-8 h-8 flex-shrink-0"
                                                alt={title}
                                            />
                                            <span className="font-medium text-foreground truncate block" style={{ maxWidth: '280px' }}>
                                                {title}
                                            </span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </ScrollArea>
                    )}
                </div>
            )}
        </div>
    );
}

