// Disable Right-Click
document.addEventListener('contextmenu', event => event.preventDefault());

// Disable F12 and common DevTool shortcuts
document.onkeydown = function(e) {
  if (e.keyCode == 123 || (e.ctrlKey && e.shiftKey && e.keyCode == 'I'.charCodeAt(0))) {
    return false;
  }
};
        // ================================================================
        // SECTION A — FIREBASE & UTILITIES
        // ================================================================
        const firebaseConfig = {
            apiKey:            "AIzaSyDQVX_gTv-zp-tRAJfhmOAo8utuOAlxSjU",
            authDomain:        "fisat-echo.firebaseapp.com",
            projectId:         "fisat-echo",
            storageBucket:     "fisat-echo.firebasestorage.app",
            messagingSenderId: "671697672068",
            appId:             "1:671697672068:web:e22a7092e85d47cb8befd1"
        };

        firebase.initializeApp(firebaseConfig);
        const db = firebase.firestore();
        function col(name) { return db.collection(name); }

        function escHtml(str) {
            if (!str) return '';
            return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        }

        function avatarUrl(name) {
            return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=F59E0B&color=fff`;
        }

        function formatDate(isoDate) {
            if (!isoDate) return '';
            const [year, month, day] = isoDate.split('-');
            const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            return `${parseInt(day, 10)} ${months[parseInt(month, 10) - 1]} ${year}`;
        }

        // ================================================================
        // SECTION B — APP STATE & LISTENERS
        // ================================================================
        const state = { members: [], achievements: [], activities: [], events: [], teamsData: {} };

        function setupRealtimeListeners() {
            col('members').orderBy('timestamp', 'desc').onSnapshot(
                snap => { state.members = snap.docs.map(d => ({ id: d.id, ...d.data() })); renderMembers(); },
                err => console.error('[ECHO] Members error:', err)
            );
            col('achievements').orderBy('timestamp', 'desc').onSnapshot(
                snap => { state.achievements = snap.docs.map(d => ({ id: d.id, ...d.data() })); renderAchievements(); },
                err => console.error('[ECHO] Achievements error:', err)
            );
            col('activities').orderBy('timestamp', 'desc').onSnapshot(
                snap => { state.activities = snap.docs.map(d => ({ id: d.id, ...d.data() })); renderActivities(); },
                err => console.error('[ECHO] Activities error:', err)
            );
            col('events').orderBy('timestamp', 'desc').onSnapshot(
                snap => { state.events = snap.docs.map(d => ({ id: d.id, ...d.data() })); renderEvents(); },
                err => console.error('[ECHO] Events error:', err)
            );
        }

        setupRealtimeListeners();

        // ================================================================
        // SECTION C — RENDER FUNCTIONS
        // ================================================================

        // Reusable function to generate standard horizontal member cards
        function generateMemberCardHtml(m, i, isReveal = false) {
            const hasLink = !!m.profileLinkUrl;
            let badgeIcon = 'fas fa-link', badgeClass = 'portfolio', tooltipText = m.name;
            if(hasLink) {
                if(m.profileLinkType === 'linkedin') { badgeIcon = 'fab fa-linkedin-in'; badgeClass = 'linkedin'; tooltipText = 'View LinkedIn'; }
                else if(m.profileLinkType === 'portfolio') { badgeIcon = 'fas fa-briefcase'; badgeClass = 'portfolio'; tooltipText = 'View Portfolio'; }
                else if(m.profileLinkType === 'college') { badgeIcon = 'fas fa-university'; badgeClass = 'college'; tooltipText = 'College Profile'; }
            }
            
            const animationClasses = isReveal ? 'glow-card reveal' : 'hover:-translate-y-1 hover:shadow-lg transition-all duration-300';
            const transitionStyle = isReveal ? `style="transition-delay:${i * 80}ms;"` : '';

            return `
            <div class="member-card-wrapper bg-white dark:bg-brand-card rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between gap-4 group ${hasLink ? 'has-link' : ''} ${animationClasses}" ${transitionStyle} ${hasLink ? `onclick="window.open('${escHtml(m.profileLinkUrl)}','_blank','noopener')"` : ''}>
                ${hasLink ? `<div class="profile-badge ${badgeClass}"><i class="${badgeIcon} text-xs"></i></div><div class="member-tooltip">${tooltipText}</div>` : ''}
                
                <div class="flex-1 min-w-0 text-left">
                    <h3 class="text-lg font-bold group-hover:text-brand-orange transition-colors truncate">${escHtml(m.name)}</h3>
                    <p class="text-sm text-brand-orange font-medium mt-0.5">${escHtml(m.role)}</p>
                </div>
                <div class="member-img-wrap w-16 h-16 sm:w-20 sm:h-20 rounded-full flex-shrink-0 border-2 border-gray-200 dark:border-gray-700 shadow-sm relative overflow-hidden">
                    <img src="${escHtml(m.image || avatarUrl(m.name))}" alt="${escHtml(m.name)}" class="absolute inset-0 w-full h-full object-cover object-top" onerror="this.src='${avatarUrl(m.name)}'">
                </div>
            </div>`;
        }

        function renderMembers() {
            // Sort by priority (lowest number first, 999 for those without)
            const faculty  = state.members.filter(m => m.memberType === 'faculty').sort((a,b) => (a.priority||999) - (b.priority||999));
            const students = state.members.filter(m => m.memberType !== 'faculty').sort((a,b) => (a.priority||999) - (b.priority||999));

            // Separate students into Core Individuals and Teams
            const individuals = students.filter(m => m.displayFormat !== 'team');
            const teamMembers = students.filter(m => m.displayFormat === 'team');
            
            // Group the team members
            state.teamsData = {};
            teamMembers.forEach(m => {
                const tName = m.teamName || 'Other Team';
                if(!state.teamsData[tName]) state.teamsData[tName] = [];
                state.teamsData[tName].push(m);
            });

            const mentorSection   = document.getElementById('mentors-section');
            const mentorsGrid     = document.getElementById('mentors-grid');
            const studentsSection = document.getElementById('students-section');
            const membersGrid     = document.getElementById('members-grid');

            // 1. Render Students/Execs
            studentsSection.classList.remove('hidden');
            if (students.length === 0) {
                membersGrid.innerHTML = `<div class="col-span-full text-center py-16 text-gray-400">No team members added yet.</div>`;
            } else {
                let htmlContent = '';

                // A. Add core individuals first
                if (individuals.length > 0) {
                    htmlContent += individuals.map((m, i) => generateMemberCardHtml(m, i, true)).join('');
                }

                // B. Add Teams as distinct interactive cards below individuals
                const teamNames = Object.keys(state.teamsData);
                if (teamNames.length > 0) {
                    const teamsCardsHtml = teamNames.map((tName, i) => {
                        const team = state.teamsData[tName];
                        const displayAvatars = team.slice(0, 4).map(m => `<img src="${escHtml(m.image || avatarUrl(m.name))}" class="w-10 h-10 rounded-full border-2 border-white dark:border-brand-card -ml-3 first:ml-0 object-cover" onerror="this.src='${avatarUrl(m.name)}'">`).join('');
                        const extraCount = team.length > 4 ? `<div class="w-10 h-10 rounded-full border-2 border-white dark:border-brand-card bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300 flex items-center justify-center text-xs font-bold -ml-3 z-10">+${team.length-4}</div>` : '';
                        
                        return `
                        <div class="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-brand-card dark:to-[#172033] rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 cursor-pointer hover:-translate-y-1 hover:shadow-lg hover:border-brand-orange transition-all duration-300 flex items-center justify-between group reveal" style="transition-delay:${i * 80}ms;" onclick="openTeamModal('${escHtml(tName)}')">
                            <div class="pr-4">
                                <h3 class="text-xl font-bold mb-1.5 text-gray-800 dark:text-gray-100 group-hover:text-brand-orange transition-colors">${escHtml(tName)}</h3>
                                <p class="text-sm text-gray-500 dark:text-gray-400 font-medium">${team.length} Member${team.length !== 1 ? 's' : ''}</p>
                            </div>
                            <div class="flex items-center pl-3">
                                <div class="flex">${displayAvatars}${extraCount}</div>
                                <div class="ml-5 w-10 h-10 rounded-full bg-brand-orange/10 text-brand-orange flex items-center justify-center group-hover:bg-brand-orange group-hover:text-white transition-colors flex-shrink-0 shadow-sm"><i class="fas fa-arrow-right"></i></div>
                            </div>
                        </div>`;
                    }).join('');

                    // Wrap teams in a full width section
                    htmlContent += `
                        <div class="col-span-full mt-10 mb-4 pt-10 border-t border-gray-200 dark:border-gray-800 reveal">
                            <h4 class="text-2xl font-bold text-center mb-8">Specialized Teams</h4>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">${teamsCardsHtml}</div>
                        </div>
                    `;
                }

                membersGrid.innerHTML = htmlContent;
            }

            // 2. Render Mentors (Faculty)
            if (faculty.length > 0) {
                mentorSection.classList.remove('hidden');
                mentorsGrid.innerHTML = faculty.map((m, i) => {
                    const hasLink = !!m.profileLinkUrl;
                    let badgeIcon = 'fas fa-link', badgeClass = 'portfolio', tooltipText = m.name;
                    if(hasLink) {
                        if(m.profileLinkType === 'linkedin') { badgeIcon = 'fab fa-linkedin-in'; badgeClass = 'linkedin'; tooltipText = 'View LinkedIn'; }
                        else if(m.profileLinkType === 'portfolio') { badgeIcon = 'fas fa-briefcase'; badgeClass = 'portfolio'; tooltipText = 'View Portfolio'; }
                        else if(m.profileLinkType === 'college') { badgeIcon = 'fas fa-university'; badgeClass = 'college'; tooltipText = 'College Profile'; }
                    }

                    return `
                    <div class="mentor-card bg-white dark:bg-brand-card rounded-2xl p-6 flex flex-col items-center text-center border border-gray-100 dark:border-gray-800 reveal group w-full sm:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1.5rem)] max-w-[320px] ${hasLink ? 'has-link cursor-pointer' : ''}" 
                         style="transition-delay:${i * 80}ms;" 
                         ${hasLink ? `onclick="window.open('${escHtml(m.profileLinkUrl)}','_blank','noopener')"` : ''}>
                        
                        ${hasLink ? `<div class="profile-badge ${badgeClass}"><i class="${badgeIcon} text-xs"></i></div><div class="member-tooltip">${tooltipText}</div>` : ''}

                        <div class="w-32 h-32 sm:w-40 sm:h-40 mb-5 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 relative shrink-0 shadow-inner border border-gray-200 dark:border-gray-700">
                            <img src="${escHtml(m.image || avatarUrl(m.name))}" alt="${escHtml(m.name)}" class="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105" onerror="this.src='${avatarUrl(m.name)}'">
                        </div>
                        <div class="w-full">
                            <h3 class="text-xl font-bold group-hover:text-brand-orange transition-colors mb-1">${escHtml(m.name)}</h3>
                            <p class="text-sm text-gray-500 dark:text-gray-400 font-medium mb-2">${escHtml(m.role)}</p>
                            ${m.description ? `<p class="text-sm text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-3">${escHtml(m.description)}</p>` : ''}
                        </div>
                    </div>
                `}).join('');
            } else {
                mentorSection.classList.add('hidden');
            }

            setTimeout(() => document.querySelectorAll('#members .reveal').forEach(el => revealObserver.observe(el)), 50);
        }

        // --- Team Modal Functions ---
        function openTeamModal(teamName) {
            const team = state.teamsData[teamName];
            if(!team) return;

            document.getElementById('team-modal-title').textContent = teamName;
            document.getElementById('team-modal-subtitle').textContent = `${team.length} Member${team.length !== 1 ? 's' : ''}`;
            
            const grid = document.getElementById('team-modal-grid');
            // Render without reveal classes since it's a popup
            grid.innerHTML = team.map((m, i) => generateMemberCardHtml(m, i, false)).join('');
            
            const modal = document.getElementById('team-modal');
            modal.classList.remove('hidden');
            // trigger reflow
            void modal.offsetWidth;
            modal.classList.add('open-modal');
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
        }

        function closeTeamModal() {
            const modal = document.getElementById('team-modal');
            modal.classList.remove('open-modal');
            setTimeout(() => {
                modal.classList.add('hidden');
                document.body.style.overflow = '';
            }, 300); // Matches the transition duration
        }

        function buildPosterPlaceholder(name) {
            return `
                <div class="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 px-6 text-center">
                    <div class="w-12 h-12 rounded-xl bg-brand-orange/20 flex items-center justify-center mb-3">
                        <i class="fas fa-star text-brand-orange text-xl"></i>
                    </div>
                    <p class="text-gray-800 dark:text-white font-bold text-base leading-tight line-clamp-2">${escHtml(name)}</p>
                </div>`;
        }

        function renderEvents() {
            const grid = document.getElementById('events-grid');
            if (state.events.length === 0) {
                grid.innerHTML = `<div class="w-full text-center py-16 text-gray-400"><i class="fas fa-calendar-star text-4xl mb-3 block opacity-30"></i>No events posted yet. Check back soon!</div>`;
                return;
            }

            grid.innerHTML = state.events.map((ev, i) => {
                const statusClass = ev.status === 'ongoing' ? 'event-status-ongoing' : ev.status === 'completed' ? 'event-status-completed' : 'event-status-upcoming';
                const statusLabel = ev.status === 'ongoing' ? 'Ongoing' : ev.status === 'completed' ? 'Completed' : 'Upcoming';
                const statusDot   = ev.status === 'ongoing' ? '<span class="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>' : '';
                
                const placeholderHtml = buildPosterPlaceholder(ev.name);
                
                const posterHtml = ev.poster
                    ? `<div class="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 mb-5 flex-shrink-0 shadow-inner">
                           <div class="absolute inset-0 z-0 flex items-center justify-center">${placeholderHtml}</div>
                           <img src="${escHtml(ev.poster)}" alt="poster" class="absolute inset-0 w-full h-full object-cover z-10 transition-opacity duration-300" onerror="this.style.opacity='0';">
                       </div>`
                    : `<div class="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 mb-5 flex-shrink-0 shadow-inner">${placeholderHtml}</div>`;

                const dateHtml = ev.date ? `<p class="text-xs text-gray-400 mt-1"><i class="fas fa-calendar-alt mr-1"></i>${formatDate(ev.date)}</p>` : '';
                const btnHtml = (ev.btnLabel && ev.btnUrl)
                    ? `<a href="${escHtml(ev.btnUrl)}" target="_blank" rel="noopener" class="inline-flex items-center gap-2 px-6 py-2.5 mt-5 bg-brand-orange hover:bg-yellow-500 text-white font-bold rounded-xl shadow-lg hover:shadow-brand-orange/40 hover:-translate-y-0.5 transition-all duration-300 self-start text-sm w-full justify-center">
                          ${escHtml(ev.btnLabel)} <i class="fas fa-arrow-right text-xs"></i>
                       </a>` : '';

                return `
                <div class="event-card bg-white dark:bg-brand-card p-5 reveal w-full max-w-[360px]" style="transition-delay:${i * 100}ms;">
                    ${posterHtml}
                    <div class="flex-1 flex flex-col justify-between w-full">
                        <div>
                            <div class="flex items-center justify-between gap-2 flex-wrap mb-3">
                                <span class="event-status-badge ${statusClass}">${statusDot} ${statusLabel}</span>
                            </div>
                            <h3 class="text-xl font-extrabold leading-snug">${escHtml(ev.name)}</h3>
                            ${dateHtml}
                        </div>
                        ${btnHtml}
                    </div>
                </div>`;
            }).join('');

            setTimeout(() => document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el)), 50);
        }

        function renderAchievements() {
            const list = document.getElementById('achievements-list');
            if (state.achievements.length === 0) {
                list.innerHTML = `<div class="text-center py-16 text-gray-400">Achievements will appear here soon.</div>`;
                return;
            }
            list.innerHTML = state.achievements.map((a, i) => {
                const hasLink = !!a.link;
                const dateStr = a.date ? `<span class="text-xs text-gray-400 ml-3"><i class="fas fa-calendar-alt mr-1"></i>${formatDate(a.date)}</span>` : '';
                return `
                <div class="achievement-card bg-white dark:bg-brand-card rounded-2xl p-6 md:p-8 shadow-md border border-gray-100 dark:border-gray-800 glow-card reveal group ${hasLink ? 'cursor-pointer' : ''}"
                     style="transition-delay:${i * 80}ms;" ${hasLink ? `onclick="window.open('${escHtml(a.link)}','_blank','noopener')"` : ''}>
                    <div class="flex items-start justify-between gap-4 flex-wrap">
                        <div class="flex-1 min-w-0">
                            <h3 class="text-xl font-bold mb-1 group-hover:text-brand-orange transition-colors">${escHtml(a.title)} ${hasLink ? `<i class="fas fa-external-link-alt text-xs text-gray-400 ml-2"></i>` : ''}</h3>
                            <p class="text-sm text-brand-orange font-medium mb-3"><i class="fas fa-users mr-1.5"></i>${escHtml(a.names)}${dateStr}</p>
                            <p class="text-gray-600 dark:text-gray-300 leading-relaxed text-sm">${escHtml(a.description)}</p>
                        </div>
                    </div>
                </div>`;
            }).join('');
            setTimeout(() => list.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el)), 50);
        }

        function renderActivities() {
            const wrap = document.getElementById('activities-list');
            if (state.activities.length === 0) {
                wrap.innerHTML = `<div class="text-center py-16 text-gray-400">No activities posted yet.</div>`;
                return;
            }
            wrap.innerHTML = state.activities.map((a, i) => {
                const hasLink = !!a.link;
                const dateStr = a.date ? `<span class="text-xs text-gray-400"><i class="fas fa-calendar-alt mr-1"></i>${formatDate(a.date)}</span>` : '';
                return `
                <div class="flex items-center justify-between p-5 gap-4 ${i < state.activities.length - 1 ? 'border-b border-gray-100 dark:border-gray-800' : ''} hover:bg-brand-orange/5 dark:hover:bg-brand-orange/10 transition-colors group ${hasLink ? 'activity-row-link' : 'activity-row-nolink'}"
                     ${hasLink ? `onclick="window.open('${escHtml(a.link)}','_blank','noopener')"` : ''}>
                    <div class="flex flex-col"><span class="font-semibold text-base uppercase tracking-wide group-hover:text-brand-orange transition-colors">${escHtml(a.title)}</span>${dateStr}</div>
                    ${hasLink ? `<a href="${escHtml(a.link)}" target="_blank" rel="noopener" onclick="event.stopPropagation()" class="flex-shrink-0 px-5 py-2 border border-brand-orange text-brand-orange text-sm font-bold rounded-lg hover:bg-brand-orange hover:text-white hover:-translate-y-0.5 transition-all duration-200 shadow hover:shadow-lg">View <i class="fas fa-external-link-alt ml-1 text-xs"></i></a>` : ''}
                </div>`;
            }).join('');
        }

        // Contact Form
        async function handleContactSubmit(event) {
            event.preventDefault();
            const btn = document.getElementById('contact-submit-btn');
            const origTxt = btn.innerHTML;
            const name = document.getElementById('c-name').value.trim();
            const email = document.getElementById('c-email').value.trim();
            const message = document.getElementById('c-message').value.trim();

            if (!name || !email || !message) return;
            btn.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i>Sending…';
            btn.disabled = true;

            try {
                await col('contact_messages').add({ name, email, message, read: false, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
                document.getElementById('contact-form').classList.add('hidden');
                document.getElementById('contact-success').classList.remove('hidden');
            } catch (err) {
                console.error('[ECHO] Contact form error:', err);
                showToast('Failed to send message. Please try again.', 'error');
                btn.innerHTML = origTxt;
                btn.disabled = false;
            }
        }

        // IntersectionObserver for reveal animation
        const revealObserver = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('active'); obs.unobserve(entry.target); } });
        }, { threshold: 0.1 });
        window.addEventListener('load', () => document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el)));

        // Theme
        if (localStorage.getItem('theme') === 'light') document.documentElement.classList.remove('dark');
        function toggleTheme() {
            document.documentElement.classList.toggle('dark');
            localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
        }
        document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
        document.getElementById('theme-toggle-mobile').addEventListener('click', toggleTheme);

        // Toast
        let toastTimer;
        function showToast(message, type = 'success') {
            const toast = document.getElementById('toast');
            document.getElementById('toast-message').textContent = message;
            document.getElementById('toast-icon').className = type === 'error' ? 'fas fa-times-circle text-red-400 text-xl' : 'fas fa-check-circle text-brand-orange text-xl';
            toast.classList.add('show');
            clearTimeout(toastTimer);
            toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
        }
   
