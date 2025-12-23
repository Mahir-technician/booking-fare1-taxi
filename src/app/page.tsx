'use client';

import React, { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import toast, { Toaster } from 'react-hot-toast';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

// --- TypeScript Definitions ---
type LngLat = [number, number];

interface SuggestionItem {
  text: string;
  center: LngLat;
  isHeader?: boolean;
  name?: string;
}

interface BookingData {
  pickup: string;
  dropoff: string;
  vehicle: string;
  price: string;
  oldPrice?: string;
  date: string;
  time: string;
  flight: string;
  meet: boolean;
  pax: string;
  bags: string;
  // Return Trip
  returnPickup?: string;
  returnDropoff?: string;
  returnDate?: string;
  returnTime?: string;
  returnFlight?: string;
  returnMeet?: boolean;
}

declare global {
  interface Window {
    mapboxgl: any;
    google: any;
  }
}

// --- Constants ---
const MAPBOX_TOKEN = 'pk.eyJ1IjoiZmFyZTFsdGQiLCJhIjoiY21pcnN4MWZlMGhtcDU2c2dyMTlvODJoNSJ9.fyUV4gMDcEBgWZnQfxS7XA';

const PRESET_DATA: Record<string, {name: string, center: LngLat}[]> = {
  'Airports': [
    { name: 'Southampton Airport', center: [-1.3568, 50.9503] },
    { name: 'Heathrow Airport Terminal 2', center: [-0.4497, 51.4696] },
    { name: 'Heathrow Airport Terminal 3', center: [-0.4597, 51.4708] },
    { name: 'Heathrow Airport Terminal 4', center: [-0.4455, 51.4594] },
    { name: 'Heathrow Airport Terminal 5', center: [-0.4899, 51.4719] },
    { name: 'Gatwick Airport', center: [-0.1821, 51.1537] },
    { name: 'London City Airport', center: [0.0553, 51.5048] },
    { name: 'London Luton Airport', center: [-0.3718, 51.8763] },
    { name: 'London Stansted Airport', center: [0.2353, 51.8853] }
  ],
  'Cruise Terminals': [
    { name: 'Southampton Port', center: [-1.4147, 50.8872] },
    { name: 'Portsmouth Port', center: [-1.0895, 50.8123] }
  ]
};

const vehicles = [
  { name: "Standard Saloon", image: "https://www.fareone.co.uk/wp-content/uploads/2025/11/Saloon-2.png", perMile: 1.67, hourly: 25, passengers: 4, luggage: 2, description: "Economic" },
  { name: "Executive Saloon", image: "https://www.fareone.co.uk/wp-content/uploads/2025/12/executive-saloon.png", perMile: 2.25, hourly: 25, passengers: 3, luggage: 2, description: "Mercedes E-Class" },
  { name: "Standard MPV", image: "https://www.fareone.co.uk/wp-content/uploads/2025/11/People-Carrier-3.png", perMile: 2.37, hourly: 25, passengers: 6, luggage: 8, description: "Group Travel" },
  { name: "8 Seater", image: "https://www.fareone.co.uk/wp-content/uploads/2025/11/Executive-Mini-Bus.png", perMile: 2.57, hourly: 25, passengers: 8, luggage: 16, description: "Mini Bus" }
];

// --- Icons (Inline SVGs for Performance) ---
const Icons = {
  MapPin: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  Calendar: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  Clock: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Plane: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>,
  User: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
  Briefcase: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
  CheckCircle: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  RotateCw: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
};

// --- Helper: Global Header Component ---
const Header = () => {
  const { data: session } = useSession();

  return (
      <header id="site-header" className="fixed z-50 w-full top-0">
        <div className="glow-wrapper mx-auto">
          <div className="glow-content flex items-center justify-between px-4 sm:px-6 h-16 md:h-20 bg-black/90 backdrop-blur-md border-b border-brand-gold/20">
            <a href="/" className="font-serif text-xl md:text-2xl font-bold tracking-widest text-gradient-gold">FARE 1 TAXI</a>
            
            {session ? (
                <a href="/dashboard" className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-800 border border-brand-gold text-brand-gold hover:bg-gray-700 transition" title="Go to Dashboard">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                </a>
            ) : (
                <a href="tel:+442381112682" className="flex items-center gap-2 bg-secondaryBg/80 border border-brand/40 text-brand px-3 py-2 rounded-full hover:bg-brand-gold/10 transition">
                    <span className="text-sm font-bold text-brand-gold">+44 2381 112682</span>
                </a>
            )}
          </div>
        </div>
      </header>
  );
};

// ==========================================
// 1. MAIN BOOKING FORM COMPONENT
// ==========================================
const MainBookingForm = () => {
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [sheetOverlayOpen, setSheetOverlayOpen] = useState(true);
  const [bottomBarVisible, setBottomBarVisible] = useState(false);
  const router = useRouter();
  
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [stops, setStops] = useState<string[]>([]);
  const [flightNumber, setFlightNumber] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [meetGreet, setMeetGreet] = useState(false);
  const [pax, setPax] = useState(1);
  const [bags, setBags] = useState(0);
  
  const [filteredVehicles, setFilteredVehicles] = useState<typeof vehicles>([]);
  const [selectedVehicleIndex, setSelectedVehicleIndex] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);
  const [distanceDisplay, setDistanceDisplay] = useState('0 mi');
  const [promoText, setPromoText] = useState("REACH £130 & GET 15% OFF");
  const [promoClass, setPromoClass] = useState('text-brand-gold');
  const [oldPriceVisible, setOldPriceVisible] = useState(false);
  const [oldPrice, setOldPrice] = useState(0);
  const currentDistanceMiles = useRef(0);
  
  const [pickupSuggestions, setPickupSuggestions] = useState<SuggestionItem[]>([]);
  const [dropoffSuggestions, setDropoffSuggestions] = useState<SuggestionItem[]>([]);
  const [stopSuggestions, setStopSuggestions] = useState<{ [key: string]: SuggestionItem[] }>({});

  const mapRef = useRef<any>(null);
  const startMarker = useRef<any>(null);
  const endMarker = useRef<any>(null);
  const stopMarkers = useRef<{ [key: string]: any }>({});
  const routeWaypoints = useRef<{ pickup: LngLat | null, dropoff: LngLat | null, stops: (LngLat | null)[] }>({ pickup: null, dropoff: null, stops: [] });
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mainSheetRef = useRef<HTMLDivElement>(null);
  const vehicleContainerRef = useRef<HTMLDivElement>(null);
  
  const enableDragScroll = (s: HTMLElement | null) => {
    if (!s) return;
    let isDown = false, startX = 0, scrollLeft = 0;
    s.addEventListener('mousedown', e => { isDown = true; startX = e.pageX - s.offsetLeft; scrollLeft = s.scrollLeft; });
    s.addEventListener('mouseup', () => isDown = false);
    s.addEventListener('mouseleave', () => isDown = false);
    s.addEventListener('mousemove', e => { if (!isDown) return; e.preventDefault(); s.scrollLeft = scrollLeft - (e.pageX - s.offsetLeft - startX) * 2; });
  };

  useEffect(() => {
    const now = new Date();
    setDate(now.toISOString().split('T')[0]);
    setTime(now.toTimeString().substring(0, 5));

    if (typeof window !== 'undefined' && window.mapboxgl) {
      window.mapboxgl.accessToken = MAPBOX_TOKEN;
      mapRef.current = new window.mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [-0.1276, 51.5074],
        zoom: 11,
        attributionControl: false,
        pitchWithRotate: false
      });
      mapRef.current.scrollZoom.disable();
      mapRef.current.on('touchstart', () => mapRef.current.dragPan.enable());
    }
    
    enableDragScroll(vehicleContainerRef.current);
  }, []);

  useEffect(() => {
    const filtered = vehicles.filter(v => v.passengers >= pax && v.luggage >= bags);
    setFilteredVehicles(filtered);
    if (filtered.length > 0 && !filtered.some((v, i) => i === selectedVehicleIndex)) {
      setSelectedVehicleIndex(0);
    }
  }, [pax, bags]);

  const updatePrice = useCallback(() => {
    if (currentDistanceMiles.current <= 0) return;
    let p = currentDistanceMiles.current * vehicles[selectedVehicleIndex].perMile;
    if (p < 5) p = 5;
    if (meetGreet) p += 5;
    
    if (p >= 130) {
      setOldPriceVisible(true);
      setOldPrice(p);
      p = p * 0.85;
      setPromoText("15% DISCOUNT APPLIED");
      setPromoClass('text-green-400');
    } else {
      setOldPriceVisible(false);
      setPromoText("REACH £130 & GET 15% OFF");
      setPromoClass('text-brand-gold');
    }
    setTotalPrice(p);
  }, [selectedVehicleIndex, meetGreet]);

  useEffect(() => { updatePrice(); }, [selectedVehicleIndex, meetGreet, updatePrice]);

  const checkVisibility = () => {
    const p = routeWaypoints.current.pickup;
    const d = routeWaypoints.current.dropoff;
    setBottomBarVisible(!!p && !!d);
  };

  const calculateRoute = () => {
    if (!routeWaypoints.current.pickup || !routeWaypoints.current.dropoff || !mapRef.current) return;
    let coords: LngLat[] = [routeWaypoints.current.pickup];
    routeWaypoints.current.stops.forEach(s => { if (s) coords.push(s); });
    coords.push(routeWaypoints.current.dropoff);
    const coordString = coords.map(c => c.join(',')).join(';');
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordString}?geometries=geojson&access_token=${MAPBOX_TOKEN}`;
    fetch(url).then(r => r.json()).then(data => {
      if (!data.routes?.length) return;
      const r = data.routes[0];
      const distMiles = r.distance / 1609.34;
      currentDistanceMiles.current = distMiles;
      setDistanceDisplay(distMiles.toFixed(1) + ' mi');
      updatePrice();
      if (mapRef.current.getSource('route')) {
        mapRef.current.getSource('route').setData(r.geometry);
      } else {
        mapRef.current.addLayer({ 
            id: 'route', type: 'line', 
            source: { type: 'geojson', data: r.geometry }, 
            paint: { 'line-color': '#D4AF37', 'line-width': 4, 'line-opacity': 0.8 } 
        });
      }
      const bounds = new window.mapboxgl.LngLatBounds();
      coords.forEach(c => bounds.extend(c));
      mapRef.current.fitBounds(bounds, { padding: 80 });
    });
  };

  const expandSheetAndCloseOthers = (id: string) => {
    setPickupSuggestions([]);
    setDropoffSuggestions([]);
    setStopSuggestions({});
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setSheetExpanded(true);
      if (mainSheetRef.current) mainSheetRef.current.scrollTo(0, 0);
    }
    handleTyping(id, (document.getElementById(id) as HTMLInputElement)?.value || '');
  };

  const showPresets = (type: string) => {
    let list: SuggestionItem[] = [];
    Object.keys(PRESET_DATA).forEach(category => {
      list.push({ isHeader: true, text: category, center: [0,0] });
      PRESET_DATA[category].forEach((p) => list.push({ text: p.name, center: p.center }));
    });
    if (type === 'pickup') setPickupSuggestions(list);
    if (type === 'dropoff') setDropoffSuggestions(list);
    if (type.startsWith('stop-')) setStopSuggestions(prev => ({ ...prev, [type]: list }));
  };

  const handleTyping = (type: string, value: string) => {
    if (type === 'pickup') routeWaypoints.current.pickup = null;
    if (type === 'dropoff') routeWaypoints.current.dropoff = null;
    checkVisibility();
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (value.length === 0) { showPresets(type); return; }
    if (value.length < 3) { setPickupSuggestions([]); setDropoffSuggestions([]); return; }
    debounceTimer.current = setTimeout(() => {
      fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(value)}.json?access_token=${MAPBOX_TOKEN}&country=gb&limit=5&types=poi,address`)
        .then(r => r.json()).then(data => {
          let list: SuggestionItem[] = [];
          if (data.features?.length) {
            data.features.forEach((f: any) => list.push({ text: f.place_name, center: f.center as LngLat }));
          }
          if (type === 'pickup') setPickupSuggestions(list);
          if (type === 'dropoff') setDropoffSuggestions(list);
        });
    }, 300);
  };

  const selectLocation = (type: string, name: string, coords: LngLat) => {
    if (!mapRef.current) return;
    if (type === 'pickup') {
      setPickup(name);
      routeWaypoints.current.pickup = coords;
      if (startMarker.current) startMarker.current.remove();
      startMarker.current = new window.mapboxgl.Marker({ color: '#D4AF37' }).setLngLat(coords).addTo(mapRef.current);
      mapRef.current.flyTo({ center: coords, zoom: 13 });
      setPickupSuggestions([]);
    } else if (type === 'dropoff') {
      setDropoff(name);
      routeWaypoints.current.dropoff = coords;
      if (endMarker.current) endMarker.current.remove();
      endMarker.current = new window.mapboxgl.Marker({ color: '#ef4444' }).setLngLat(coords).addTo(mapRef.current);
      setDropoffSuggestions([]);
    }
    setSheetExpanded(false);
    calculateRoute();
    checkVisibility();
  };

  const getUserLocation = () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
            selectLocation('pickup', 'Current Location', [pos.coords.longitude, pos.coords.latitude]);
            setSheetOverlayOpen(false);
        });
    } else {
        alert('Geolocation is not supported by your browser.');
    }
  };

  const goToBooking = () => {
    let url = `/?pickup=${encodeURIComponent(pickup)}&dropoff=${encodeURIComponent(dropoff)}&vehicle=${encodeURIComponent(vehicles[selectedVehicleIndex].name)}&price=${totalPrice.toFixed(2)}&date=${date}&time=${time}&flight=${flightNumber}&meet=${meetGreet}&pax=${pax}&bags=${bags}`;
    if (oldPriceVisible) {
        url += `&oldPrice=${oldPrice.toFixed(2)}`;
    }
    router.push(url);
  };

  return (
    <div className="bg-primary-black text-gray-200 font-sans min-h-screen flex flex-col overflow-hidden">
      <Header />
      <div className="fixed inset-0 h-[45vh] z-0">
        <div id="map" className="w-full h-full"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-primary-black pointer-events-none"></div>
      </div>
      <div id="main-sheet" ref={mainSheetRef} className={`relative z-10 mt-[38vh] floating-sheet rounded-t-[2rem] border-t border-brand-gold/20 shadow-2xl flex-1 overflow-y-auto pb-40 ${sheetExpanded ? 'sheet-expanded' : ''}`}>
        
        <div className="drag-handle w-12 h-1 bg-white/10 rounded-full mx-auto mt-3 mb-5"></div>
        <div className={`close-sheet-btn absolute top-4 right-4 z-50 cursor-pointer p-2 ${sheetExpanded ? 'block' : 'hidden'}`} onClick={() => setSheetExpanded(false)}>
          <div className="bg-black/50 rounded-full p-2 border border-brand-gold/30">✕</div>
        </div>

        {/* BOOKING FORM CONTENT */}
        <div className="w-[90%] mx-auto max-w-5xl space-y-5 pt-1 px-1 mb-20">
            {/* Pickup */}
            <div className="location-field-wrapper group">
              <div className="unified-input rounded-xl flex items-center h-[54px] px-4 bg-black">
                <div className="mr-3 text-brand-gold">●</div>
                <input type="text" placeholder="Enter pickup location" onFocus={() => expandSheetAndCloseOthers('pickup')} onChange={(e) => { setPickup(e.target.value); handleTyping('pickup', e.target.value); }} value={pickup} className="text-[15px] font-medium w-full bg-transparent outline-none text-white"/>
              </div>
              {pickupSuggestions.length > 0 && <ul className="suggestions-list block">{pickupSuggestions.map((item, i) => <li key={i} onClick={() => selectLocation('pickup', item.text, item.center)}>{item.text}</li>)}</ul>}
            </div>

            {/* Dropoff */}
            <div className="location-field-wrapper group">
              <div className="unified-input rounded-xl flex items-center h-[54px] px-4 bg-black">
                <div className="mr-3 text-brand-gold">■</div>
                <input type="text" placeholder="Enter destination" onFocus={() => expandSheetAndCloseOthers('dropoff')} onChange={(e) => { setDropoff(e.target.value); handleTyping('dropoff', e.target.value); }} value={dropoff} className="text-[15px] font-medium w-full bg-transparent outline-none text-white"/>
              </div>
              {dropoffSuggestions.length > 0 && <ul className="suggestions-list block">{dropoffSuggestions.map((item, i) => <li key={i} onClick={() => selectLocation('dropoff', item.text, item.center)}>{item.text}</li>)}</ul>}
            </div>

            <div className="h-[1px] w-full bg-white/5"></div>

            {/* Extra Fields */}
            <div className="grid grid-cols-2 gap-3">
               <div className="unified-input rounded-xl h-[50px] px-3 flex items-center"><input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-transparent text-white outline-none"/></div>
               <div className="unified-input rounded-xl h-[50px] px-3 flex items-center"><input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full bg-transparent text-white outline-none"/></div>
            </div>

            {/* Vehicles */}
            <h3 className="text-[10px] font-bold text-gray-500 uppercase mt-2">Select Class</h3>
            <div className="vehicle-scroll flex overflow-x-auto gap-3 snap-x pb-4 px-1">
              {filteredVehicles.map((v, i) => (
                <div key={i} onClick={() => setSelectedVehicleIndex(i)} className={`vehicle-card min-w-[130px] p-3 rounded-2xl cursor-pointer snap-center flex flex-col justify-between ${selectedVehicleIndex === i ? 'selected' : ''}`}>
                  <div className="selected-badge text-[8px] font-bold px-1.5 rounded uppercase" style={{opacity: selectedVehicleIndex === i ? 1 : 0}}>Selected</div>
                  <div><h4 className="text-white font-bold text-xs">{v.name}</h4><p className="text-[9px] text-gray-400">{v.description}</p></div>
                  <div className="flex-1 flex justify-center py-2"><img src={v.image} className="w-full object-contain" /></div>
                  <span className="text-brand-gold font-bold text-[10px]">£{v.perMile}/mi</span>
                </div>
              ))}
            </div>
        </div>
      </div>

      {/* BOTTOM BAR */}
      <div id="bottom-bar" className={`bottom-bar fixed bottom-0 left-0 w-full bg-black/95 border-t border-brand-gold/20 py-2 px-5 z-[80] safe-area-pb shadow-[0_-10px_40px_rgba(0,0,0,1)] ${bottomBarVisible ? 'visible' : ''}`}>
        <div className="flex justify-between items-center max-w-5xl mx-auto gap-4">
          <div className="flex flex-col justify-center min-w-0">
            <div className={`text-[9px] font-black ${promoClass} mb-0.5 tracking-wider uppercase truncate`}>{promoText}</div>
            <div className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mb-0.5">Fare Estimate</div>
            <div className="flex flex-wrap items-baseline gap-x-2">
                {oldPriceVisible && <span className="text-[10px] font-bold text-red-500 line-through opacity-70">£{oldPrice.toFixed(2)}</span>}
                <p className="text-3xl font-heading font-black text-white">£<span className="text-brand-gold">{totalPrice.toFixed(2)}</span><span className="text-[10px] text-gray-400 font-medium tracking-normal ml-1">{distanceDisplay}</span></p>
            </div>
          </div>
          <button onClick={goToBooking} className="bg-brand-gold text-black font-extrabold py-2 px-6 rounded-xl shadow-[0_0_20px_rgba(212,175,55,0.3)]">Book Now</button>
        </div>
      </div>

      {/* LOCATION SHEET OVERLAY */}
      {sheetOverlayOpen && (
        <div className="fixed inset-0 bg-black/90 z-[90] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-[#121212] w-full max-w-md p-6 rounded-t-[2rem] sm:rounded-[2rem] border border-white/10">
                <h2 className="text-2xl font-black text-white text-center mb-4">Where to?</h2>
                <button onClick={getUserLocation} className="w-full bg-brand-gold text-black font-bold py-3.5 rounded-xl mb-3">Use Current Location</button>
                <button onClick={() => setSheetOverlayOpen(false)} className="w-full bg-white/5 text-gray-400 font-semibold py-3.5 rounded-xl border border-white/5">Enter Address</button>
            </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// 2. PREMIUM BOOKING SUMMARY COMPONENT
// ==========================================
const BookingSummary = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [showPopup, setShowPopup] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Extract params
  const data: BookingData = {
    pickup: searchParams?.get('pickup') || '',
    dropoff: searchParams?.get('dropoff') || '',
    vehicle: searchParams?.get('vehicle') || '',
    price: searchParams?.get('price') || '0',
    oldPrice: searchParams?.get('oldPrice') || undefined,
    date: searchParams?.get('date') || '',
    time: searchParams?.get('time') || '',
    flight: searchParams?.get('flight') || '',
    meet: searchParams?.get('meet') === 'true',
    pax: searchParams?.get('pax') || '1',
    bags: searchParams?.get('bags') || '0',
    // Return params
    returnPickup: searchParams?.get('returnPickup') || undefined,
    returnDropoff: searchParams?.get('returnDropoff') || undefined,
    returnDate: searchParams?.get('returnDate') || undefined,
    returnTime: searchParams?.get('returnTime') || undefined,
    returnFlight: searchParams?.get('returnFlight') || undefined,
    returnMeet: searchParams?.get('returnMeet') === 'true',
  };

  const isComplete = data.pickup && data.dropoff && data.vehicle && data.price;
  
  // Find vehicle image
  const vehicleObj = vehicles.find(v => v.name === data.vehicle) || vehicles[0];

  const handleBookOrder = async () => {
    setIsBooking(true);
    try {
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, stops: [] }),
      });

      if (res.ok) {
        toast.success("Booking Successful! Redirecting...");
        setTimeout(() => router.push('/dashboard'), 2000);
      } else {
        toast.error("Failed to create booking.");
      }
    } catch (err) {
      toast.error("Something went wrong.");
    } finally {
      setIsBooking(false);
    }
  };

  const handleOnlinePayment = async () => {
    setIsProcessingPayment(true);
    try {
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, stops: [] }),
      });

      const orderData = await res.json();

      if (res.ok && orderData.orderId) {
        const payRes = await fetch('/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ price: data.price, bookingId: orderData.orderId }),
        });

        const payData = await payRes.json();

        if (payData.url) {
            window.location.href = payData.url;
        } else {
            toast.error("Payment initiation failed.");
        }
      } else {
        toast.error("Failed to initiate booking.");
      }
    } catch (err) {
      toast.error("Something went wrong with payment.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleLoginRedirect = () => {
    const currentUrl = typeof window !== 'undefined' ? window.location.href : '/';
    router.push(`/log-in?redirect=${encodeURIComponent(currentUrl)}`);
  };

  if (!isComplete) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <h2 className="text-xl font-bold text-red-500 mb-2">Incomplete Booking Details</h2>
        <Link href="/" className="bg-brand-gold text-black font-bold py-2 px-6 rounded">Start New Booking</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 pb-20 font-sans selection:bg-brand-gold selection:text-black">
      <Header />
      <Toaster position="top-center" toastOptions={{ style: { background: '#111', color: '#D4AF37', border: '1px solid #D4AF37' } }} />
      
      <div className="max-w-3xl mx-auto mt-20 md:mt-24">
        <div className="bg-black/80 backdrop-blur-md border border-brand-gold/30 rounded-2xl overflow-hidden shadow-2xl relative">
            {/* Header Badge */}
            <div className="absolute top-0 right-0 bg-brand-gold text-black text-xs font-black px-4 py-1 rounded-bl-xl uppercase tracking-widest">
                Official Quote
            </div>

            <div className="p-6 md:p-8">
                <h1 className="text-2xl md:text-3xl font-heading font-bold text-brand-gold mb-6 tracking-wide flex items-center gap-3">
                    <span className="bg-brand-gold/10 p-2 rounded-lg border border-brand-gold/20">
                        <Icons.Briefcase />
                    </span>
                    BOOKING SUMMARY
                </h1>

                {/* Section 1: Outbound */}
                <div className="mb-8 relative pl-6 border-l-2 border-brand-gold/20">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 bg-black border-2 border-brand-gold rounded-full"></div>
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Outbound Journey</h3>
                    
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="mt-1 text-green-500"><Icons.MapPin /></div>
                            <div>
                                <p className="text-xs text-gray-500 font-bold uppercase">Pickup</p>
                                <p className="text-white font-medium text-lg leading-tight">{data.pickup}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="mt-1 text-red-500"><Icons.MapPin /></div>
                            <div>
                                <p className="text-xs text-gray-500 font-bold uppercase">Dropoff</p>
                                <p className="text-white font-medium text-lg leading-tight">{data.dropoff}</p>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mt-2 bg-white/5 p-4 rounded-xl border border-white/5">
                            <div className="flex items-center gap-2">
                                <div className="text-brand-gold"><Icons.Calendar /></div>
                                <div>
                                    <p className="text-[10px] text-gray-400 uppercase">Date</p>
                                    <p className="text-sm font-bold">{data.date}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="text-brand-gold"><Icons.Clock /></div>
                                <div>
                                    <p className="text-[10px] text-gray-400 uppercase">Time</p>
                                    <p className="text-sm font-bold">{data.time}</p>
                                </div>
                            </div>
                            {data.flight && (
                                <div className="flex items-center gap-2 col-span-2 border-t border-white/10 pt-2 mt-1">
                                    <div className="text-blue-400"><Icons.Plane /></div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase">Flight No</p>
                                        <p className="text-sm font-bold">{data.flight}</p>
                                    </div>
                                </div>
                            )}
                            {data.meet && (
                                <div className="col-span-2 flex items-center gap-2 text-xs text-green-400 font-bold bg-green-900/20 p-2 rounded-lg border border-green-500/20">
                                    <Icons.CheckCircle /> Meet & Greet Included (+£5)
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Section 2: Return Trip (Conditional) */}
                {data.returnPickup && (
                    <div className="mb-8 relative pl-6 border-l-2 border-blue-500/30">
                        <div className="absolute -left-[9px] top-0 w-4 h-4 bg-black border-2 border-blue-500 rounded-full"></div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-bold text-blue-400 uppercase tracking-widest">Return Journey</h3>
                            <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30">5% Discount Applied</span>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="mt-1 text-green-500"><Icons.MapPin /></div>
                                <div>
                                    <p className="text-xs text-gray-500 font-bold uppercase">Return Pickup</p>
                                    <p className="text-white font-medium text-lg leading-tight">{data.returnPickup}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="mt-1 text-red-500"><Icons.MapPin /></div>
                                <div>
                                    <p className="text-xs text-gray-500 font-bold uppercase">Return Dropoff</p>
                                    <p className="text-white font-medium text-lg leading-tight">{data.returnDropoff}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-2 bg-blue-900/10 p-4 rounded-xl border border-blue-500/10">
                                <div className="flex items-center gap-2">
                                    <div className="text-blue-400"><Icons.Calendar /></div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase">Date</p>
                                        <p className="text-sm font-bold">{data.returnDate}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="text-blue-400"><Icons.Clock /></div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase">Time</p>
                                        <p className="text-sm font-bold">{data.returnTime}</p>
                                    </div>
                                </div>
                                {data.returnFlight && (
                                    <div className="flex items-center gap-2 col-span-2 border-t border-white/10 pt-2 mt-1">
                                        <div className="text-blue-400"><Icons.Plane /></div>
                                        <div>
                                            <p className="text-[10px] text-gray-400 uppercase">Return Flight</p>
                                            <p className="text-sm font-bold">{data.returnFlight}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Section 3: Vehicle & Pax */}
                <div className="mb-8 bg-white/5 rounded-2xl p-4 border border-white/5 flex flex-row items-center gap-4">
                    <div className="w-24 h-16 relative bg-black/50 rounded-lg flex items-center justify-center p-1 border border-white/10">
                        <img src={vehicleObj.image} alt={data.vehicle} className="w-full h-full object-contain" />
                    </div>
                    <div className="flex-1">
                        <h4 className="text-brand-gold font-bold text-sm uppercase">{data.vehicle}</h4>
                        <div className="flex gap-4 mt-1 text-gray-400 text-xs">
                            <span className="flex items-center gap-1"><Icons.User /> {data.pax} Passengers</span>
                            <span className="flex items-center gap-1"><Icons.Briefcase /> {data.bags} Bags</span>
                        </div>
                    </div>
                </div>

                {/* Section 4: Price Breakdown */}
                <div className="border-t border-dashed border-brand-gold/30 pt-6">
                    <div className="flex flex-col gap-2 items-end">
                        {data.oldPrice && (
                            <div className="flex items-center gap-2">
                                <span className="bg-red-500/20 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Standard Rate</span>
                                <span className="text-gray-500 line-through text-sm font-medium">£{data.oldPrice}</span>
                            </div>
                        )}
                        
                        {/* Discount Badges */}
                        <div className="flex gap-2">
                            {data.returnPickup && <span className="bg-blue-500/20 text-blue-400 text-[10px] font-bold px-2 py-1 rounded border border-blue-500/30 uppercase">Return Discount</span>}
                            {(data.oldPrice || parseInt(data.price) > 100) && <span className="bg-green-500/20 text-green-400 text-[10px] font-bold px-2 py-1 rounded border border-green-500/30 uppercase">15% Off Applied</span>}
                        </div>

                        <div className="flex items-end gap-2 mt-1">
                            <span className="text-gray-400 text-sm font-bold uppercase mb-1">Total To Pay</span>
                            <span className="text-4xl font-black text-brand-gold drop-shadow-md">£{data.price}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions Footer */}
            <div className="bg-white/5 p-6 border-t border-brand-gold/10">
                <div className="space-y-4">
                    {session ? (
                        <>
                            <button 
                                onClick={handleBookOrder} 
                                disabled={isBooking || isProcessingPayment}
                                className="w-full bg-brand-gold hover:bg-[#e6c355] text-black font-black py-4 rounded-xl text-lg transition-all shadow-[0_0_20px_rgba(212,175,55,0.4)] flex items-center justify-center gap-2"
                            >
                                {isBooking ? "Confirming..." : (
                                    <>CONFIRM & PAY IN CAB <Icons.CheckCircle /></>
                                )}
                            </button>
                            
                            <div className="mt-4 border-t border-white/5 pt-4">
                                <p className="text-[10px] text-center text-gray-500 uppercase tracking-widest mb-3">Or Pay Securely Online</p>
                                <PayPalScriptProvider options={{ clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "test", currency: "GBP" }}>
                                    <PayPalButtons 
    style={{ layout: "vertical", color: "gold", shape: "rect", label: "pay" }}
    createOrder={async (paypalData, actions) => {
        return actions.order.create({
            intent: "CAPTURE",
            purchase_units: [{ amount: { currency_code: "GBP", value: data.price } }]
        });
    }}
    onApprove={async (paypalData, actions) => {
    if (actions.order) {
        await actions.order.capture();
        toast.success("Payment Successful");
        handleBookOrder();
    } else {
        toast.error("Payment failed: Order not found.");
    }
}}
/>
                                </PayPalScriptProvider>
                            </div>
                        </>
                    ) : (
                        <button onClick={() => setShowPopup(true)} className="w-full bg-brand-gold hover:bg-[#e6c355] text-black font-black py-4 rounded-xl text-lg transition-all shadow-[0_0_20px_rgba(212,175,55,0.4)]">
                            PROCEED TO CHECKOUT
                        </button>
                    )}
                    
                    <p className="text-center text-[10px] text-gray-500 font-medium uppercase tracking-widest">
                        <Icons.RotateCw /> Free Cancellation up to 24h before
                    </p>
                </div>
            </div>
        </div>
      </div>

      {showPopup && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
          <div className="bg-[#121212] w-full max-w-md rounded-2xl border border-brand-gold/40 p-6 relative shadow-2xl">
            <button onClick={() => setShowPopup(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition">✕</button>

            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-white mb-2 font-heading">Complete Your Booking</h2>
              <p className="text-xs text-gray-400">Please login to manage your booking securely.</p>
            </div>
            
            <button onClick={handleLoginRedirect} className="block w-full bg-white text-black font-bold text-center py-3.5 rounded-xl mb-6 hover:bg-gray-200 transition">Login / Register</button>
            
            <div className="flex items-center gap-3 mb-6"><div className="h-[1px] bg-gray-800 flex-1"></div><span className="text-[10px] text-gray-500 uppercase tracking-widest">OR FAST BOOKING</span><div className="h-[1px] bg-gray-800 flex-1"></div></div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <a href={`https://wa.me/442381112682?text=${encodeURIComponent(`New Booking Request:\nFrom: ${data.pickup}\nTo: ${data.dropoff}\nCar: ${data.vehicle}\nPrice: £${data.price}\nTime: ${data.date} ${data.time}`)}`} target="_blank" className="flex flex-col items-center justify-center bg-[#25D366] hover:bg-[#1da851] text-white py-3 rounded-xl transition border border-white/5"><span className="font-bold text-sm">WhatsApp</span></a>
              <a href={`mailto:booking@fare1.co.uk?subject=Booking Request&body=${encodeURIComponent(`Pickup: ${data.pickup}\nDropoff: ${data.dropoff}\nVehicle: ${data.vehicle}\nPrice: £${data.price}`)}`} className="flex flex-col items-center justify-center bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl transition border border-white/5"><span className="font-bold text-sm">Email</span></a>
            </div>
            <div className="bg-brand-gold/10 border border-brand-gold/20 rounded-lg p-3"><p className="text-[10px] text-brand-gold text-center leading-relaxed">Note: Online payment is available after login. WhatsApp/Email bookings are "Pay in Cab" only.</p></div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// 3. PAGE CONTENT WRAPPER
// ==========================================
export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-brand-gold">Loading...</div>}>
      <BookingContent />
    </Suspense>
  );
}

function BookingContent() {
  const params = useSearchParams();
  // We check if basic booking data is present to toggle views
  const hasBookingData = params && params.has('pickup') && params.has('dropoff') && params.has('vehicle');
  return <>{hasBookingData ? <BookingSummary /> : <MainBookingForm />}</>;
}