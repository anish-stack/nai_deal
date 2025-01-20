import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

// Hero Component
const Hero = ({ title, description, mainImage }) => (
    <div
        className="relative h-[60vh] overflow-hidden"
        style={{
            backgroundImage: `url(${mainImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
        }}
    >
        {title && description  && (

        <div className="absolute inset-0 ">
            <div className="container mx-auto px-4 h-full flex flex-col justify-center">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
                    {title}
                </h1>
                <p className="text-lg md:text-xl text-gray-200 max-w-2xl">
                    {description}
                </p>
            </div>
        </div>
        )}
    </div>
);

// Content Renderer Component
const ContentRenderer = ({ htmlContent }) => (
    <div
        className="prose prose-lg max-w-none"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
);

// Main Page Component
const Free_Page = () => {
    const [pages, setPages] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPages = async () => {
            try {
                const response = await axios.get('http://localhost:4255/api/v1/Other/get-free-page');
                setPages(response.data);
                setLoading(false);
            } catch (error) {
                toast.error('Failed to fetch pages');
                setLoading(false);
            }
        };

        fetchPages();
    }, []);

    // console.log(pages)

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (pages.length === 0) {
        return null;
    }

    const page = pages[0];

    return (
        page.isContentShow && (
            <div className="h-full bg-gray-50">
                
             {page.title && page.description && (                        
                <a href={page.buttonLink} target="_blank">
                 <Hero
                 title={page.title}
                 description={page.description}
                 mainImage={page.MainImage}
             />
             </a>

               )}

                <main className="container mx-auto px-4">
                    
                        {page.HtmlContent && (
                            <div className="bg-white mt-8 rounded-xl shadow-lg p-6 md:p-8 lg:p-12">
                            <div className="space-y-8">
                                <ContentRenderer htmlContent={page.HtmlContent} />
                            </div>
                            </div>
                        )}
                    

                    
                </main>
            </div>
        )
    );
};

export default Free_Page;
