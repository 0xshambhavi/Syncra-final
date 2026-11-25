import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Award, Bell, CalendarDays, CalendarPlus, Check,
  ChevronDown, ChevronLeft, ChevronRight, Clock3, Compass, ExternalLink,
  Filter, MapPin, Search, Settings, Ticket, Users, X, UserRound, Sparkles,
  Bookmark, BookmarkCheck, CalendarCheck, CircleHelp, LogOut
} from 'lucide-react';
import { api } from './utils/api';

type CampusEvent = {
  id: string; title: string; club: string; date: string; time: string;
  venue: string; description: string; capacity: number; registered: number;
  status: string; event_type?: string; type?: string; fee?: number;
  registration_deadline?: string; seats_left?: number; guest_speakers?: {name:string;affiliation?:string;role?:string;photo?:string}[];
  faculty_coordinator?: string; discord_url?: string; whatsapp_url?: string;
  club_url?: string; volunteer_recruiting?: boolean; poster_url?: string; end_date?:string; end_time?:string; tracks?:string[]; prize_pool?:number; registration_url?:string; registration_qr_url?:string; demo_links?:boolean; demo_content?:boolean;
};
type Notice = { id:string; title:string; message:string; read?:boolean; created_at?:string; type?:string };
type ViewMode = 'month' | 'week' | 'agenda';

const CLUBS = [
  {name:'TEDxBMSIT&M',tagline:'Ideas worth spreading.',members:0,accent:'coral',initials:'TX',category:'Ideas & community',website:'https://www.tedxbmsitm.in/'},
  {name:'Node',tagline:'Network of Decentralised Engineers.',members:0,accent:'mint',initials:'N',category:'Technology',website:'https://nodebmsit.live/'},
  {name:'Web3',tagline:'Explore decentralised technology.',members:0,accent:'blue',initials:'W3',category:'Technology',website:''},
  {name:'Access Denied',tagline:'Learn, explore and secure.',members:0,accent:'lavender',initials:'AD',category:'Cybersecurity',website:''},
  {name:'AR/VR Club',tagline:'Build immersive experiences.',members:0,accent:'pink',initials:'AV',category:'Extended reality',website:''},
  {name:'E-Cell',tagline:'Build ideas into ventures.',members:0,accent:'yellow',initials:'EC',category:'Entrepreneurship',website:''},
  {name:'Alterino',tagline:'Debug, build and compete.',members:0,accent:'coral',initials:'AL',category:'Technology',website:''}
];
