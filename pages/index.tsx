import MovieComponent from "@/components/movie";
import MoviePopable from "@/components/movie/movie_popup";
import SearchModal from "@/components/searchModal/SearchModal";
import { Audio } from "@/components/ui/audio";
import { Button } from "@/components/ui/button";
import ScrollIndicator from "@/components/ui/scroll_indicator";
import { Video } from "@/components/ui/video";
import WelcomeComponent from "@/components/welcome/welcome_component";
import { PrismaClient, type Frame, type Prisma } from "@prisma/client";
import { motion, useScroll, useTransform, useViewportScroll } from "framer-motion";
import { ChevronDown, Search, Volume2, VolumeX } from "lucide-react";
import type { InferGetStaticPropsType } from "next";
import Image from "next/image";
import React, { forwardRef, useEffect, useRef, useState } from "react";

export const dynamic = "force-dynamic";

const skipWelcome = false;



export type TMovieIndex = Prisma.MovieGetPayload<{
    include: {
        preferredFrame: true;
        colors: true;
        directors: true;
        frames: true;
    };
}>;

// Récupérer tous les films depuis la base de données (Prisma)
export async function getStaticProps() {
    const prisma = new PrismaClient();
    const movies: TMovieIndex[] = await prisma.movie.findMany({
        include: {
            preferredFrame: true,
            colors: true,
            directors: true,
            frames: true,
        },
        orderBy: {
            createdAt: "desc"
        }
    });
    console.log(movies.length)
    // Si le nombre de films est inférieur à 10, ajouter des films fictifs

    return {
        props: {
            movies: movies,
        },
        revalidate: 1,
    };
}

export default function Home({
        movies,
    }: InferGetStaticPropsType<typeof getStaticProps>) {
    const [selectedMovie, setSelectedMovie] = useState<TMovieIndex | undefined>(
        undefined
    );
    const [isMusicPlaying, setIsMusicPlaying] = useState(false);
    const [showWelcome, setShowWelcome] = useState(!skipWelcome);
    const audio = React.useRef<HTMLAudioElement>(null);
    const video = React.useRef<HTMLVideoElement>(null);
    const [isSearchModalOpen, setSearchModalOpen] = useState(false);

    const isMobile = () => {
        if (typeof window !== "undefined") {
            const aspectRatio = window.innerWidth / window.innerHeight;
            return aspectRatio < 1;
        }
        return false;
    }

    const [isMuted, setIsMuted] = useState(false);

    // get from the uri the parameters : muted, movieId
    React.useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const muted = urlParams.get("muted");
        if (muted === "true") {
            setIsMuted(true);
        }
    }, []);

    // set title of the page
    React.useEffect(() => {
        document.title = "Kaléidoscope";
    }, []);

    const playMusic = () => {
        if (!audio.current) return;
        audio.current.play();
    };
    const pauseMusic = () => {
        if (!audio.current) return;
        audio.current.pause();
    };
    const playVideo = () => {
        if (!video.current) return;
        video.current.play();
    };
    const pauseVideo = () => {
        if (!video.current) return;
        video.current.pause();
    };

    React.useEffect(() => {
        if (!audio.current) return;
        const au = audio.current;

        au.addEventListener("play", () => {
            setIsMusicPlaying(true);
        });
        au.addEventListener("pause", () => {
            setIsMusicPlaying(false);
        });

        return () => {
            au.removeEventListener("play", () => { });
            au.removeEventListener("pause", () => { });
        };
    }, []);

    const handleDiscoverClick = () => {
        setShowWelcome(false);
        if (!isMuted) {
            playMusic();
        } else {
            pauseMusic();
        }
        playVideo();
    };
    const [filteredMovies, setFilteredMovies] = useState<Array<TMovieIndex>>(movies as Array<TMovieIndex>);

    function search({
        text: searchTerms,
        color: selectedColor,
    }: {
        text: string | undefined;
        color: string | undefined;
    }) {
        function titleSearch(movie: (typeof movies)[0]) {
            if (!searchTerms?.length) return true;
            return movie.title.toLowerCase().includes(searchTerms.toLowerCase());
        }

        function directorSearch(movie: (typeof movies)[0]) {
            if (!searchTerms?.length) return true;
            return movie.directors
                .map((director) => `${director.firstName} ${director.lastName}`)
                .join(" ")
                .toLowerCase()
                .includes(searchTerms.toLowerCase());
        }

        function colorSearch(movie: (typeof movies)[0]) {
            if (!selectedColor) return true;
            return movie.colors.map((color) => color.value).includes(selectedColor);
        }

        const filtered = movies.filter(
            (movie) =>
                (titleSearch(movie) || directorSearch(movie)) && colorSearch(movie)
        );
        setFilteredMovies(filtered as Array<TMovieIndex>);

        movieListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    }

    const movieListRef = useRef<HTMLDivElement>(null);
    const mainRef = useRef<HTMLDivElement>(null);

    const { scrollYProgress } = useScroll(
        {
            axis: "y",
        }
    );


    return (
        <main className="relative w-full h-full flex flex-col overflow-y-auto " ref={mainRef}>
            <Audio
                ref={audio}
                className="hidden"
                id="backgroundMusic"
                autoPlay
                loop
                src="/assets/claudio.mp3"
                type="audio/mp3"
            />
            <motion.div
                initial={{ opacity: 1 }}
                animate={{ opacity: showWelcome ? 1 : 0 }}
                transition={{ duration: 1 }}
            >
                {showWelcome && (
                    <WelcomeComponent onDiscoverClick={handleDiscoverClick} />
                )}
            </motion.div>
            {!showWelcome && (
                <motion.div
                    className="bg-black h-full w-full"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: showWelcome ? 0 : 1 }}
                    transition={{ duration: 1 }}
                >
                    <IntroVideo ref={video} />
                    <MovieList
                        ref={movieListRef}
                        movies={filteredMovies}
                        onClick={(movie) => {
                            if (
                                movie.title ===
                                "Dummy Movie"
                            )
                                return;
                            setSelectedMovie(
                                movie,
                            );
                        }}
                    />
                    <Button
                        className="fixed bottom-4 left-4 z-10 text-white font-bold py-2 px-4 rounded"
                        onClick={() => {
                            if (audio.current?.paused) {
                                playMusic();
                            } else {
                                pauseMusic();
                            }
                        }}
                    >
                        {isMusicPlaying ? (
                            <Volume2 className={"text-yellow-500"} />
                        ) : (
                            <VolumeX className={"text-yellow-500"} />
                        )}
                    </Button>
                    <Search
                        className="fixed top-4 right-4 z-20 text-yellow-500 font-bold cursor-pointer"
                        onClick={() => setSearchModalOpen(true)}
                    />

                    {/* biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
                    <div
                        className="fixed bottom-4 right-4 hover:cursor-pointer hover:scale-110" onClick={() => {
                            movieListRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                    >
                        <ScrollIndicator />
                    </div>
                    <SearchModal
                        isOpen={isSearchModalOpen}
                        onClose={(args) => {
                            if (args) {
                                search(args);
                            }
                            setSearchModalOpen(false);
                        }}
                    />
                    <MoviePopable
                        movie={selectedMovie ?? undefined}
                        close={() => setSelectedMovie(undefined)}
                    />

                    {/* social info after the list */}
                    <div className="w-full h-20 bg-black bg-opacity-80 flex items-center justify-center">
                        {/* instagram */}
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-2 bg-yellow-500 border-yellow-500 hover:border-yellow-600 cursor-pointer">
                            <a href="https://www.instagram.com/kaleidoscope_ynov/" target="_blank" rel="noreferrer">
                                <Image
                                    src="/assets/instagram.svg"
                                    alt="instagram"
                                    width={20}
                                    height={20}
                                />
                            </a>
                        </div>
                    </div>


                </motion.div>
            )
            }


        </main >
    );
}


const MovieList = forwardRef<HTMLDivElement, {
    movies: TMovieIndex[]
    onClick: (movie: TMovieIndex) => void
}>(({ movies, onClick }, ref) => {

    const { scrollY } = useScroll();

    return (
        <motion.div
            className="w-full  bg-black bg-opacity-80 "
            ref={ref}
        >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 px-2">
                {movies.length === 0 && (
                    <div
                        className="text-white h-screen w-screen
                                 flex items-center justify-center"
                    >
                        <div className="text-center">
                            <p className="text-4xl font-bold">Aucun film trouvé</p>
                            <p className="text-xl">
                                Essayez de rechercher un autre film
                            </p>
                        </div>
                    </div>
                )}
                {movies.map((movie) => {
                    return (
                        <MovieComponent
                            className="aspect-video"
                            onClick={() => {
                                onClick(movie);
                            }}
                            key={movie.id}
                            movie={movie}
                            preferredFrame={movie.preferredFrame as Frame}
                        />
                    );
                })}
            </div>
        </motion.div>
    )
});

MovieList.displayName = "MovieList";

const IntroVideo = forwardRef<HTMLVideoElement, React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>
>((props, ref) => {


    return (
        <div className="w-full h-screen flex items-center justify-center " {...props}>
            <div className="w-[600px] h-[250px] flex items-center justify-center relative">
                <Video
                    size={{ width: 470 }}
                    autoPlay
                    src="/Video_kaléidoscope.mp4"
                    type="video/mp4"
                    muted
                    loop
                    ref={ref}
                />
                <Image
                    style={{ position: "absolute" }}
                    src={"/assets/logo_transparent.svg"}
                    alt={"hgv"}
                    width={700}
                    height={350}
                />
            </div>
        </div>
    );
});

IntroVideo.displayName = "IntroVideo";

