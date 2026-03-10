import { createClient } from 'https://esm.sh/@sanity/client@6.21.3';
import { toHTML } from 'https://esm.sh/@portabletext/to-html@2.0.0';

document.addEventListener('DOMContentLoaded', () => {

    // 1. Mobile Navigation Toggle
    const mobileToggle = document.querySelector('.mobile-toggle');
    const primaryNav = document.getElementById('primary-nav');
    const navLinks = document.querySelectorAll('#primary-nav a');

    if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            primaryNav.classList.toggle('nav-open');
            const icon = mobileToggle.querySelector('i');
            if (primaryNav.classList.contains('nav-open')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-xmark');
            } else {
                icon.classList.remove('fa-xmark');
                icon.classList.add('fa-bars');
            }
        });
    }

    // Close mobile nav when clicking a link
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            primaryNav.classList.remove('nav-open');
            const icon = mobileToggle.querySelector('i');
            if (icon) {
                icon.classList.remove('fa-xmark');
                icon.classList.add('fa-bars');
            }
        });
    });

    // 2. Sticky Header changing background on scroll
    const header = document.getElementById('site-header');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // 3. Smooth Scrolling for anchor links (fallback/enhancement over CSS)
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                const headerOffset = header.offsetHeight;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // 4. Scroll Reveal Animations with Intersection Observer
    const animateElements = document.querySelectorAll('.animate-on-scroll');

    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.15 // Trigger when 15% of element is visible
    };

    const scrollObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target); // Stop observing once animated
            }
        });
    }, observerOptions);

    animateElements.forEach(el => {
        scrollObserver.observe(el);
    });

    // 5. Form Submission Handling (with Formspree)
    const quoteForm = document.getElementById('quote-form');
    const formStatus = document.getElementById('form-status');

    if (quoteForm) {
        quoteForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Prevent actual default submission

            // Gather button and original text to show loading state
            const submitBtn = quoteForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;

            // Loading state
            submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Sending...';
            submitBtn.disabled = true;

            try {
                // Gather form data into an object
                const formData = new FormData(quoteForm);
                const dataObj = Object.fromEntries(formData.entries());

                // Send data to custom Node backend
                const response = await fetch("http://localhost:5000/api/contact", {
                    method: 'POST',
                    body: JSON.stringify(dataObj),
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                });

                if (response.ok) {
                    // Success UI
                    formStatus.innerHTML = `<div style="margin-top: 1rem; padding: 1rem; border-radius: 8px; background-color: #d1fae5; color: #065f46; text-align: center; border: 1px solid #34d399;">
                        <i class="fa-solid fa-check-circle"></i> Thank you! Your request has been sent. We'll be in touch shortly.
                    </div>`;

                    // Reset form
                    quoteForm.reset();
                } else {
                    // Error UI from custom backend response
                    const data = await response.json();
                    const errorMsg = data.error || "Oops! There was a problem submitting your form";

                    formStatus.innerHTML = `<div style="margin-top: 1rem; padding: 1rem; border-radius: 8px; background-color: #fee2e2; color: #991b1b; text-align: center; border: 1px solid #f87171;">
                        <i class="fa-solid fa-circle-xmark"></i> ${errorMsg}
                    </div>`;
                }
            } catch (error) {
                // Network error UI
                formStatus.innerHTML = `<div style="margin-top: 1rem; padding: 1rem; border-radius: 8px; background-color: #fee2e2; color: #991b1b; text-align: center; border: 1px solid #f87171;">
                    <i class="fa-solid fa-circle-xmark"></i> Oops! There was a network problem submitting your form.
                </div>`;
            } finally {
                // Restore button
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;

                // Clear message after 5 seconds
                setTimeout(() => {
                    formStatus.innerHTML = '';
                }, 5000);
            }
        });
    }

    // ==========================================
    // Sanity CMS Integration
    // ==========================================
    const sanityClient = createClient({
        projectId: 'wumbvafi', // Sanity Project ID
        dataset: 'production', // Default dataset name
        useCdn: true, // `false` if you want to ensure fresh data
        apiVersion: '2023-01-01', // use a UTC date string
    });

    // Generate accurate image URLs from Sanity image references
    function urlFor(source, width = 600, height = 400) {
        if (!source || !source.asset) return '';
        // Decode the Sanity ref (e.g. image-xyz-100x100-jpg) into a real CDN URL
        const ref = source.asset._ref;
        if (!ref) return '';
        const parts = ref.split('-');
        const id = parts[1];
        const dimensions = parts[2];
        const format = parts[3];
        return `https://cdn.sanity.io/images/wumbvafi/production/${id}-${dimensions}.${format}?w=${width}&h=${height}&fit=crop&crop=center`;
    }

    // Fetch and Render Services
    async function loadServices() {
        const servicesGrid = document.getElementById('services-grid');
        const footerServicesList = document.getElementById('footer-services-list');
        const sidebarServicesList = document.getElementById('sidebar-services-list');

        // Get current service ID from URL if we are on service.html
        const urlParams = new URLSearchParams(window.location.search);
        const currentServiceId = urlParams.get('id') || window.location.hash.replace('#', '');

        try {
            // Groq query to fetch all 'service' documents
            const services = await sanityClient.fetch('*[_type == "service"]');

            if (services.length > 0) {
                if (servicesGrid) servicesGrid.innerHTML = ''; // clear loading text
                if (footerServicesList) footerServicesList.innerHTML = ''; // clear footer loading text
                if (sidebarServicesList) sidebarServicesList.innerHTML = ''; // clear sidebar loading text

                const serviceSelect = document.getElementById('service');
                if (serviceSelect) {
                    serviceSelect.innerHTML = '<option value="" disabled selected>Select a Service</option>';
                }

                services.forEach((service, index) => {
                    if (serviceSelect) {
                        serviceSelect.innerHTML += `<option value="${service.title.toLowerCase()}">${service.title}</option>`;
                    }
                    if (footerServicesList) {
                        footerServicesList.innerHTML += `<li><a href="service.html#${service._id}">${service.title}</a></li>`;
                    }
                    if (sidebarServicesList && service._id !== currentServiceId) {
                        sidebarServicesList.innerHTML += `<a href="service.html#${service._id}">${service.title}</a>`;
                    }

                    const delayClass = `delay-${(index % 4) + 1}`;

                    const imageUrl = urlFor(service.image);
                    const imageTag = imageUrl ? `<img src="${imageUrl}" alt="${service.title}">` : `<img src="images/plumbing.png" alt="Service Fallback Image">`; // Default fallback if no image provided in CMS

                    const iconImageUrl = service.iconImage ? urlFor(service.iconImage, 100, 100) : null;
                    const iconHTML = iconImageUrl
                        ? `<img src="${iconImageUrl}" alt="${service.title} icon" class="custom-icon-img" style="filter: brightness(0) invert(1);">`
                        : `<i class="fa-solid fa-toolbox"></i>`;
                    const cardHTML = `
                        <div class="service-card animate-on-scroll slide-up ${delayClass}">
                            <div class="card-img">
                                ${imageTag}
                                <div class="icon-bubble">${iconHTML}</div>
                            </div>
                            <div class="card-content">
                                <h3>${service.title}</h3>
                                <p>${service.description || ''}</p>
                                <a href="service.html#${service._id}" class="text-link">Read More <i class="fa-solid fa-arrow-right"></i></a>
                            </div>
                        </div>
                    `;
                    if (servicesGrid) {
                        servicesGrid.innerHTML += cardHTML;
                    }
                });

                if (serviceSelect) {
                    serviceSelect.innerHTML += '<option value="other">Other / General Repair</option>';
                }

                if (servicesGrid) {
                    // Attach intersection observer to newly created items
                    servicesGrid.querySelectorAll('.animate-on-scroll').forEach(el => {
                        scrollObserver.observe(el);
                    });
                }
            } else {
                if (servicesGrid) servicesGrid.innerHTML = '<p style="text-align: center; width: 100%; color: var(--text-dark);">No services found.</p>';
            }
        } catch (error) {
            console.error('Error fetching services from Sanity:', error);
            if (servicesGrid) servicesGrid.innerHTML = '<p style="text-align: center; width: 100%; color: var(--text-dark);">Failed to load services.</p>';
        }
    }

    // Fetch and Render Portfolio
    async function loadPortfolio() {
        const portfolioGrid = document.getElementById('portfolio-grid');
        if (!portfolioGrid) return;
        try {
            // Groq query to fetch all 'portfolio' documents
            const portfolioItems = await sanityClient.fetch('*[_type == "portfolio"]');

            if (portfolioItems.length > 0) {
                portfolioGrid.innerHTML = ''; // clear loading text
                portfolioItems.forEach((item, index) => {
                    const delayClass = `delay-${(index % 3) + 1}`;
                    const imageUrl = urlFor(item.image);
                    const category = item.category || 'General';

                    const itemHTML = `
                        <div class="portfolio-item animate-on-scroll slide-up ${delayClass}">
                            <a href="project.html#${item._id}" style="display: block; width: 100%; height: 100%;">
                                <img src="${imageUrl}" alt="${item.title}">
                                <div class="portfolio-overlay">
                                    <h3>${item.title}</h3>
                                    <p>${category.charAt(0).toUpperCase() + category.slice(1)}</p>
                                </div>
                            </a>
                        </div>
                    `;
                    portfolioGrid.innerHTML += itemHTML;
                });

                // Attach intersection observer to newly created items
                portfolioGrid.querySelectorAll('.animate-on-scroll').forEach(el => {
                    scrollObserver.observe(el);
                });
            } else {
                portfolioGrid.innerHTML = '<p style="text-align: center; width: 100%; color: var(--text-dark);">No recent work found.</p>';
            }
        } catch (error) {
            console.error('Error fetching portfolio from Sanity:', error);
            portfolioGrid.innerHTML = '<p style="text-align: center; width: 100%; color: var(--text-dark);">Failed to load portfolio.</p>';
        }
    }

    // Fetch and Render Single Service Detail Page
    async function loadServiceDetail() {
        const urlParams = new URLSearchParams(window.location.search);
        const serviceId = urlParams.get('id') || window.location.hash.replace('#', '');

        const titleEl = document.getElementById('service-title');
        const subtitleEl = document.getElementById('service-subtitle');
        const contentContainer = document.getElementById('service-content-container');
        const headerBg = document.getElementById('service-header-bg');

        if (!serviceId || !titleEl) return;

        try {
            const service = await sanityClient.fetch(`*[_type == "service" && _id == "${serviceId}"][0]`);

            if (service) {
                titleEl.textContent = service.title;
                subtitleEl.textContent = service.description || '';

                if (service.image) {
                    const bgUrl = urlFor(service.image);
                    headerBg.style.background = `linear-gradient(rgba(15, 23, 42, 0.8), rgba(15, 23, 42, 0.9)), url('${bgUrl}') center/cover`;
                }

                if (service.detailedContent && toHTML) {
                    contentContainer.innerHTML = toHTML(service.detailedContent);
                } else {
                    contentContainer.innerHTML = '<p>No detailed information available for this service yet.</p>';
                }
            } else {
                titleEl.textContent = 'Service Not Found';
                contentContainer.innerHTML = '<p>The requested service could not be found.</p>';
            }
        } catch (error) {
            console.error('Error fetching service detail:', error);
            titleEl.textContent = 'Error Loading Service';
        }
    }

    // Fetch and Render Single Portfolio Detail Page
    async function loadProjectDetail() {
        const urlParams = new URLSearchParams(window.location.search);
        const projectId = urlParams.get('id') || window.location.hash.replace('#', '');

        const titleEl = document.getElementById('project-title');
        const categoryEl = document.getElementById('project-category');
        const overviewContainer = document.getElementById('project-overview-container');
        const challengeContainer = document.getElementById('project-challenge-container');
        const headerBg = document.getElementById('project-header-bg');

        if (!projectId || !titleEl) return;

        try {
            const project = await sanityClient.fetch(`*[_type == "portfolio" && _id == "${projectId}"][0]`);

            if (project) {
                titleEl.textContent = project.title;
                const category = project.category || 'General';
                categoryEl.textContent = category.charAt(0).toUpperCase() + category.slice(1);

                if (project.image) {
                    const bgUrl = urlFor(project.image);
                    headerBg.style.background = `linear-gradient(rgba(15, 23, 42, 0.8), rgba(15, 23, 42, 0.9)), url('${bgUrl}') center/cover`;
                }

                if (project.projectDescription && toHTML) {
                    // Append after the "Project Overview" h3 tag
                    overviewContainer.innerHTML = '<h3>Project Overview</h3>' + toHTML(project.projectDescription, {
                        components: {
                            types: {
                                image: ({ value }) => `<img src="${urlFor(value).url()}" alt="Project image" style="max-width: 100%; height: auto; border-radius: 8px; margin: 20px 0;">`
                            }
                        }
                    });
                } else {
                    overviewContainer.innerHTML = '<h3>Project Overview</h3><p>Details coming soon.</p>';
                }

                if (project.challengeSolution && project.challengeSolution.length > 0 && toHTML) {
                    challengeContainer.style.display = 'block';
                    challengeContainer.innerHTML = '<h3>Challenge & Solution</h3>' + toHTML(project.challengeSolution);
                } else {
                    challengeContainer.style.display = 'none'; // Hide if no data
                    // Hide the hr above it
                    const hr = challengeContainer.previousElementSibling;
                    if (hr && hr.tagName === 'HR') hr.style.display = 'none';
                }

                // Handle Before & After Images
                const beforeAfterContainer = document.getElementById('project-before-after-container');
                const beforeImg = document.getElementById('project-before-img');
                const afterImg = document.getElementById('project-after-img');

                if (project.beforeImage && project.afterImage && beforeAfterContainer) {
                    const beforeThumbUrl = urlFor(project.beforeImage);
                    const afterThumbUrl = urlFor(project.afterImage);
                    const beforeHighResUrl = urlFor(project.beforeImage, 1600, 1200);
                    const afterHighResUrl = urlFor(project.afterImage, 1600, 1200);

                    beforeImg.src = beforeThumbUrl;
                    afterImg.src = afterThumbUrl;

                    beforeImg.classList.add('comparison-trigger');
                    afterImg.classList.add('comparison-trigger');

                    const openModalHandler = () => {
                        if (window.openComparisonModal) {
                            window.openComparisonModal(beforeHighResUrl, afterHighResUrl);
                        }
                    };

                    beforeImg.onclick = openModalHandler;
                    afterImg.onclick = openModalHandler;

                    beforeAfterContainer.style.display = 'block';
                } else if (beforeAfterContainer) {
                    beforeAfterContainer.style.display = 'none';
                }

            } else {
                titleEl.textContent = 'Project Not Found';
                overviewContainer.innerHTML = '<p>The requested project could not be found.</p>';
                challengeContainer.style.display = 'none';
            }
        } catch (error) {
            console.error('Error fetching project detail:', error);
            titleEl.textContent = 'Error Loading Project';
        }
    }


    // ==========================================
    // Interactive Before/After Comparison Modal
    // ==========================================
    let isDraggingComparison = false;
    const comparisonModal = document.getElementById('comparison-modal');
    const comparisonSlider = document.getElementById('comparison-slider');
    const comparisonContainer = document.getElementById('comparison-container');
    const comparisonBeforeWrapper = document.getElementById('modal-before-wrapper');
    const comparisonAfterWrapper = document.getElementById('modal-after-wrapper');
    const comparisonBeforeImg = document.getElementById('modal-before-img');
    const comparisonAfterImg = document.getElementById('modal-after-img');
    const comparisonCloseBtn = document.getElementById('modal-close');

    if (comparisonSlider && comparisonContainer) {
        comparisonSlider.addEventListener('mousedown', (e) => { isDraggingComparison = true; e.preventDefault(); });
        comparisonSlider.addEventListener('touchstart', (e) => { isDraggingComparison = true; }, { passive: true });

        window.addEventListener('mouseup', () => { isDraggingComparison = false; });
        window.addEventListener('touchend', () => { isDraggingComparison = false; });

        const updateSlider = (clientX) => {
            if (!isDraggingComparison) return;
            let rect = comparisonContainer.getBoundingClientRect();
            let xPos = clientX - rect.left;

            if (xPos < 0) xPos = 0;
            if (xPos > rect.width) xPos = rect.width;

            let percentage = (xPos / rect.width) * 100;
            comparisonSlider.style.left = `${percentage}%`;
            if (comparisonBeforeWrapper) {
                comparisonBeforeWrapper.style.clipPath = `inset(0 ${100 - percentage}% 0 0)`;
            }
            if (comparisonAfterWrapper) {
                comparisonAfterWrapper.style.clipPath = `inset(0 0 0 ${percentage}%)`;
            }
        };

        window.addEventListener('mousemove', (e) => updateSlider(e.clientX));
        window.addEventListener('touchmove', (e) => {
            if (isDraggingComparison) {
                updateSlider(e.touches[0].clientX);
                e.preventDefault();
            }
        }, { passive: false });
    }

    if (comparisonCloseBtn && comparisonModal) {
        const closeComparisonModal = () => { comparisonModal.classList.remove('active'); };
        comparisonCloseBtn.addEventListener('click', closeComparisonModal);
        comparisonModal.addEventListener('click', (e) => {
            if (e.target === comparisonModal) closeComparisonModal();
        });
    }

    window.openComparisonModal = function (beforeUrl, afterUrl) {
        if (!comparisonModal || !comparisonBeforeImg || !comparisonAfterImg || !comparisonSlider || !comparisonBeforeWrapper || !comparisonAfterWrapper) return;

        comparisonBeforeImg.src = beforeUrl;
        comparisonAfterImg.src = afterUrl;

        comparisonSlider.style.left = '50%';
        comparisonBeforeWrapper.style.clipPath = 'inset(0 50% 0 0)';
        comparisonAfterWrapper.style.clipPath = 'inset(0 0 0 50%)';

        comparisonModal.classList.add('active');
    };

    // Initialize Sanity loading based on page elements
    loadServices();
    if (document.getElementById('portfolio-grid')) loadPortfolio();
    if (document.getElementById('service-title')) loadServiceDetail();
    if (document.getElementById('project-title')) loadProjectDetail();

    // Handle initial hash jumps (like #portfolio) explicitly
    // Since we fetch content from Sanity asynchronously, the browser's default 
    // scrollTo behavior fires before the DOM finishes inflating. We need to 
    // re-trigger the scroll *after* our async data paints the screen.
    window.addEventListener('load', () => {
        if (window.location.hash) {
            const hash = window.location.hash;
            if (hash === '#services' || hash === '#portfolio' || hash === '#home' || hash === '#about' || hash === '#contact') {
                const target = document.querySelector(hash);
                if (target) {
                    // Give the Sanity fetch functions a little time to finish rendering
                    setTimeout(() => {
                        // Calculate offset accounting for navbar height (approx 80px)
                        const y = target.getBoundingClientRect().top + window.scrollY - 80;
                        window.scrollTo({ top: y, behavior: 'smooth' });
                    }, 500);
                }
            }
        }
    });

    // Handle clicking a different service/project while already on the detail page
    window.addEventListener('hashchange', () => {
        const hash = window.location.hash;
        if (hash !== '#services' && hash !== '#portfolio' && hash !== '#home' && hash !== '#about' && hash !== '#contact') {
            window.location.reload();
        }
    });

});
