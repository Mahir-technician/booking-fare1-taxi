'use client';

import React, { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import toast, { Toaster } from 'react-hot-toast';

// --- TypeScript Definitions ---
type LngLat = [number, number];

interface SuggestionItem {
  text: string;
  center: LngLat;
  isHeader?: boolean;
  name?: string;
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

const MAX_STOPS = 3;

// --- Custom Hook to replace useSearchParams for compatibility ---
const useCustomSearchParams = () => {
  const [params, setParams] = useState<URLSearchParams | null>(null);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setParams(new URLSearchParams(window.location.search));
    }
  }, []);

  return params;
};

// ==========================================
// 1. MAIN BOOKING FORM COMPONENT (Map & Form)
// ==========================================
const MainBookingForm = () => {
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [sheetOverlayOpen, setSheetOverlayOpen] = useState(true);
  const [bottomBarVisible, setBottomBarVisible] = useState(false);
  
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
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
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
    window.location.href = url;
  };

  return (
    <div className="bg-primary-black text-gray-200 font-sans min-h-screen flex flex-col overflow-hidden">
      <Toaster position="top-center" />
      <header id="site-header" className="fixed z-50 w-full top-0">
        <div className="glow-wrapper mx-auto">
          <div className="glow-content flex items-center justify-between px-4 sm:px-6 h-16 md:h-20 bg-black">
            <span className="font-serif text-xl md:text-2xl font-bold tracking-widest text-gradient-gold">FARE 1 TAXI</span>
            <a href="tel:+442381112682" className="flex items-center gap-2 bg-secondaryBg/80 border border-brand/40 text-brand px-3 py-2 rounded-full">
               <span className="text-sm font-bold text-brand-gold">+44 2381 112682</span>
            </a>
          </div>
        </div>
      </header>
      <div className="fixed inset-0 h-[45vh] z-0">
        <div id="map" className="w-full h-full"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-primary-black pointer-events-none"></div>
      </div>
      <div id="main-sheet" ref={mainSheetRef} className={`relative z-10 mt-[38vh] floating-sheet rounded-t-[2rem] border-t border-brand-gold/20 shadow-2xl flex-1 overflow-y-auto pb-40 ${sheetExpanded ? 'sheet-expanded' : ''}`}>
        <div className="drag-handle w-12 h-1 bg-white/10 rounded-full mx-auto mt-3 mb-5"></div>
        <div className={`close-sheet-btn absolute top-4 right-4 z-50 cursor-pointer p-2 ${sheetExpanded ? 'block' : 'hidden'}`} onClick={() => setSheetExpanded(false)}>
          <div className="bg-black/50 rounded-full p-2 border border-brand-gold/30">✕</div>
        </div>
        <div className="w-[90%] mx-auto max-w-5xl space-y-5 pt-1 px-1 mb-20">
            <div className="location-field-wrapper group">
              <div className="unified-input rounded-xl flex items-center h-[54px] px-4 bg-black">
                <div className="mr-3 text-brand-gold">●</div>
                <input type="text" placeholder="Enter pickup location" onFocus={() => expandSheetAndCloseOthers('pickup')} onChange={(e) => { setPickup(e.target.value); handleTyping('pickup', e.target.value); }} value={pickup} className="text-[15px] font-medium w-full bg-transparent outline-none text-white"/>
              </div>
              {pickupSuggestions.length > 0 && <ul className="suggestions-list block">{pickupSuggestions.map((item, i) => <li key={i} onClick={() => selectLocation('pickup', item.text, item.center)}>{item.text}</li>)}</ul>}
            </div>
            <div className="location-field-wrapper group">
              <div className="unified-input rounded-xl flex items-center h-[54px] px-4 bg-black">
                <div className="mr-3 text-brand-gold">■</div>
                <input type="text" placeholder="Enter destination" onFocus={() => expandSheetAndCloseOthers('dropoff')} onChange={(e) => { setDropoff(e.target.value); handleTyping('dropoff', e.target.value); }} value={dropoff} className="text-[15px] font-medium w-full bg-transparent outline-none text-white"/>
              </div>
              {dropoffSuggestions.length > 0 && <ul className="suggestions-list block">{dropoffSuggestions.map((item, i) => <li key={i} onClick={() => selectLocation('dropoff', item.text, item.center)}>{item.text}</li>)}</ul>}
            </div>
            <div className="h-[1px] w-full bg-white/5"></div>
            <div className="grid grid-cols-2 gap-3">
               <div className="unified-input rounded-xl h-[50px] px-3 flex items-center"><input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-transparent text-white outline-none"/></div>
               <div className="unified-input rounded-xl h-[50px] px-3 flex items-center"><input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full bg-transparent text-white outline-none"/></div>
            </div>
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
      <div id="bottom-bar" className={`bottom-bar fixed bottom-0 left-0 w-full bg-black/95 border-t border-brand-gold/20 py-2 px-5 z-[80] safe-area-pb shadow-[0_-10px_40px_rgba(0,0,0,1)] ${bottomBarVisible ? 'visible' : ''}`}>
        <div className="flex justify-between items-center max-w-5xl mx-auto gap-4">
          <div className="flex flex-col justify-center min-w-0">
            <div className={`text-[9px] font-black ${promoClass} mb-0.5 tracking-wider uppercase truncate`}>{promoText}</div>
            <div className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mb-0.5">Fare Estimate</div>
            <p className="text-3xl font-heading font-black text-white">£<span className="text-brand-gold">{totalPrice.toFixed(2)}</span></p>
          </div>
          <button onClick={goToBooking} className="bg-brand-gold text-black font-extrabold py-2 px-6 rounded-xl shadow-[0_0_20px_rgba(212,175,55,0.3)]">Book Now</button>
        </div>
      </div>
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
// 2. BOOKING SUMMARY COMPONENT (Popup & Payment)
// ==========================================
const BookingSummary = () => {
  const params = useCustomSearchParams();
  const [showPopup, setShowPopup] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  
  // Fake Session State (Since we removed next-auth)
  // For production, use useSession() from next-auth/react
  const [session, setSession] = useState<any>(null);

  // Check login status (For Demo, checks if redirected from login)
  useEffect(() => {
      // In real app, next-auth handles this automatically
      // Checking local storage or mock
      const isLogged = typeof window !== 'undefined' && localStorage.getItem('isLoggedIn');
      if (isLogged) {
          setSession({ user: { name: 'User', email: 'user@example.com' } });
      }
  }, []);

  const pickup = params?.get('pickup') || '';
  const dropoff = params?.get('dropoff') || '';
  const vehicle = params?.get('vehicle') || '';
  const price = params?.get('price') || '0';
  const date = params?.get('date') || '';
  const time = params?.get('time') || '';
  
  const isComplete = pickup && dropoff && vehicle && price;

  const handleBookOrder = async () => {
    setIsBooking(true);
    try {
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickup, dropoff, vehicle, price, date, time,
          flight: params?.get('flight') || '',
          meet: params?.get('meet') === 'true',
          pax: params?.get('pax') || '1',
          bags: params?.get('bags') || '0',
          stops: [] 
        }),
      });

      if (res.ok) {
        toast.success("Booking Successful! Redirecting...");
        setTimeout(() => window.location.href = '/dashboard', 2000);
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
        body: JSON.stringify({
          pickup, dropoff, vehicle, price, date, time,
          flight: params?.get('flight') || '',
          meet: params?.get('meet') === 'true',
          pax: params?.get('pax') || '1',
          bags: params?.get('bags') || '0',
          stops: [] 
        }),
      });

      const orderData = await res.json();

      if (res.ok && orderData.orderId) {
        const payRes = await fetch('/api/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ price, bookingId: orderData.orderId }),
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

  if (!isComplete) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <h2 className="text-xl font-bold text-red-500 mb-2">Incomplete Booking Details</h2>
        <a href="/" className="bg-brand-gold text-black font-bold py-2 px-6 rounded">Start New Booking</a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 font-sans">
      <Toaster />
      <div className="max-w-2xl mx-auto bg-black border border-brand-gold/30 rounded-2xl p-6 shadow-2xl mt-10">
        <h1 className="text-2xl md:text-3xl font-bold text-brand-gold text-center mb-8 border-b border-gray-800 pb-4">BOOKING SUMMARY</h1>
        
        <div className="space-y-4 mb-8">
          <div className="flex justify-between items-center"><span className="text-gray-400 text-sm">Pickup Point</span><span className="font-semibold text-right w-2/3">{pickup}</span></div>
          <div className="flex justify-between items-center"><span className="text-gray-400 text-sm">Destination</span><span className="font-semibold text-right w-2/3">{dropoff}</span></div>
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-800"><span className="text-gray-400 text-sm">Vehicle Class</span><span className="text-brand-gold font-bold">{vehicle}</span></div>
          <div className="flex justify-between items-center"><span className="text-gray-400 text-sm">Date & Time</span><span>{date} at {time}</span></div>
        </div>

        <div className="bg-gray-800 rounded-xl p-4 flex justify-between items-center mb-8">
          <span className="font-bold text-lg">Total To Pay</span>
          <span className="text-3xl font-black text-brand-gold">£{price}</span>
        </div>

        {/* PayPal Options for Payment */}
        <div className="mb-4">
            <PayPalScriptProvider options={{ clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "test", currency: "GBP" }}>
                <PayPalButtons 
                    style={{ layout: "vertical", color: "gold", shape: "rect", label: "pay" }} 
                    createOrder={(data, actions) => {
                        return actions.order.create({
                            intent: "CAPTURE", // Required for capture
                            purchase_units: [{
                                amount: {
                                    currency_code: "GBP",
                                    value: price // Amount to pay
                                }
                            }]
                        });
                    }}
                    onApprove={(data, actions) => {
                        return actions.order!.capture().then((details) => {
                             toast.success("PayPal Payment Successful!");
                             // Here you would call your backend to save the order
                             // handleBookOrder() or similar
                        });
                    }}
                />
            </PayPalScriptProvider>
        </div>

        <div className="space-y-3">
          <button onClick={() => setShowPopup(true)} className="w-full bg-brand-gold hover:bg-yellow-600 text-black font-black py-4 rounded-xl text-lg transition-all shadow-[0_0_20px_rgba(212,175,55,0.4)]">PROCEED TO CHECKOUT</button>
          <p className="text-center text-[10px] text-gray-500 font-medium uppercase tracking-widest">You can pay in the cab</p>
        </div>
      </div>

      {showPopup && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
          <div className="bg-[#121212] w-full max-w-md rounded-2xl border border-brand-gold/40 p-6 relative shadow-2xl">
            <button onClick={() => setShowPopup(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition">✕</button>

            {session ? (
              <div className="text-center">
                 <h2 className="text-xl font-bold text-brand-gold mb-4">Complete Your Booking</h2>
                 <p className="text-gray-400 text-sm mb-6">Choose how you want to pay</p>
                 
                 <button 
                   onClick={handleBookOrder} 
                   disabled={isBooking || isProcessingPayment}
                   className="block w-full bg-gray-800 text-white font-bold text-center py-3.5 rounded-xl mb-4 hover:bg-gray-700 transition border border-gray-600"
                 >
                   {isBooking ? "Processing..." : "Pay in Cab (Cash/Card)"}
                 </button>
                 
                 <button 
                    onClick={handleOnlinePayment}
                    disabled={isProcessingPayment || isBooking}
                    className="block w-full bg-brand-gold text-black font-bold text-center py-3.5 rounded-xl mb-6 hover:bg-yellow-600 transition"
                 >
                   {isProcessingPayment ? "Redirecting..." : "Pay with Card (Stripe)"}
                 </button>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-white mb-2">Login Required</h2>
                  <p className="text-xs text-gray-400">Please login before making the payment</p>
                </div>
                <a href={`/log-in?redirect=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`} className="block w-full bg-white text-black font-bold text-center py-3.5 rounded-xl mb-6 hover:bg-gray-200 transition">Login</a>
                <div className="flex items-center gap-3 mb-6"><div className="h-[1px] bg-gray-800 flex-1"></div><span className="text-[10px] text-gray-500 uppercase tracking-widest">OR MAKE ONE TAP BOOKING</span><div className="h-[1px] bg-gray-800 flex-1"></div></div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <a href={`https://wa.me/442381112682?text=${encodeURIComponent(`New Booking:\nFrom: ${pickup}\nTo: ${dropoff}\nCar: ${vehicle}\nPrice: £${price}\nTime: ${date} ${time}`)}`} target="_blank" className="flex flex-col items-center justify-center bg-[#25D366] hover:bg-[#1da851] text-white py-3 rounded-xl transition"><span className="font-bold text-sm">WhatsApp</span></a>
                  <a href={`mailto:booking@fare1.co.uk?subject=New Booking Request&body=${encodeURIComponent(`Pickup: ${pickup}\nDropoff: ${dropoff}\nVehicle: ${vehicle}\nPrice: £${price}\nDate: ${date} ${time}`)}`} className="flex flex-col items-center justify-center bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl transition"><span className="font-bold text-sm">Email</span></a>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3"><p className="text-[10px] text-red-400 text-center leading-relaxed">Note: If you choose WhatsApp or Email, online payment won’t be available. Payment must be made in the cab.</p></div>
              </>
            )}

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
    <Suspense fallback={<div className="text-brand-gold text-center mt-20">Loading...</div>}>
      <BookingContent />
    </Suspense>
  );
}

function BookingContent() {
  const params = useCustomSearchParams();
  const hasBookingData = params && params.has('pickup') && params.has('dropoff');
  return <>{hasBookingData ? <BookingSummary /> : <MainBookingForm />}</>;
}