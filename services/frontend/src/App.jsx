import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Dashboard from './pages/Dashboard';
import NewCustomer from './pages/NewCustomer';
import Leads from './pages/Leads';
import PredictionsLog from './pages/PredictionsLog';
import Automations from './pages/Automations';
import Settings from './pages/Settings';
import Chatbot from './pages/Chatbot';

export default function App() {
	return (
		<div className="app-layout">
			<Sidebar />
			<div className="app-main">
				<TopBar />
				<div className="app-content">
					<Routes>
						<Route path="/" element={<Dashboard />} />
						<Route path="/new-customer" element={<NewCustomer />} />
						<Route path="/leads" element={<Leads />} />
						<Route path="/predictions" element={<PredictionsLog />} />
						<Route path="/automations" element={<Automations />} />
						<Route path="/chatbot" element={<Chatbot />} />
						<Route path="/settings" element={<Settings />} />
					</Routes>
				</div>
			</div>
		</div>
	);
}
