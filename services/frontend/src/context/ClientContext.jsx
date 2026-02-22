import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useReducer,
} from 'react';

const ClientContext = createContext(null);

/* ── Default client fields matching likely dataset features ── */
export const DEFAULT_CLIENT = {
	User_ID: '',
	Age: 30,
	Gender: 'Male',
	Marital_Status: 'Single',
	Education_Level: 'Bachelor',
	Occupation: 'Employed',
	Region: 'Urban',
	Estimated_Annual_Income: 50000,
	Credit_Score: 700,
	Has_Mortgage: 0,
	Has_Investments: 0,
	Existing_Policies: 0,
	Previous_Claims_Filed: 0,
	Years_Without_Claims: 5,
	Previous_Policy_Duration_Months: 24,
	Adult_Dependents: 0,
	Child_Dependents: 0,
	Infant_Dependents: 0,
	Smoker: 0,
	Chronic_Conditions: 0,
	Risk_Tolerance: 'Medium',
};

/* ── Reducer ─────────────────────────────────────────────────── */
const initialState = {
	client: { ...DEFAULT_CLIENT },
	prediction: null, // { prediction: [...], model_version, timestamp }
	scenario: null, // copy of client data for scenario sim
	scenarioPrediction: null,
	loading: false,
	error: null,
};

function reducer(state, action) {
	switch (action.type) {
		case 'SET_CLIENT':
			return {
				...state,
				client: { ...DEFAULT_CLIENT, ...action.payload },
				prediction: null,
				scenario: null,
				scenarioPrediction: null,
				error: null,
			};
		case 'UPDATE_CLIENT_FIELD':
			return {
				...state,
				client: { ...state.client, [action.field]: action.value },
			};
		case 'SET_PREDICTION':
			return {
				...state,
				prediction: action.payload,
				loading: false,
				error: null,
			};
		case 'SET_SCENARIO':
			return { ...state, scenario: action.payload };
		case 'UPDATE_SCENARIO_FIELD':
			return {
				...state,
				scenario: { ...state.scenario, [action.field]: action.value },
			};
		case 'SET_SCENARIO_PREDICTION':
			return { ...state, scenarioPrediction: action.payload };
		case 'APPLY_SCENARIO':
			return {
				...state,
				client: { ...state.client, ...state.scenario },
				prediction: state.scenarioPrediction || state.prediction,
			};
		case 'RESET_SCENARIO':
			return { ...state, scenario: null, scenarioPrediction: null };
		case 'SET_LOADING':
			return { ...state, loading: action.payload };
		case 'SET_ERROR':
			return { ...state, error: action.payload, loading: false };
		case 'CLEAR':
			return { ...initialState };
		default:
			return state;
	}
}

/* ── Provider ────────────────────────────────────────────────── */
export function ClientProvider({ children }) {
	const [state, dispatch] = useReducer(reducer, initialState);

	const setClient = useCallback(
		(data) => dispatch({ type: 'SET_CLIENT', payload: data }),
		[],
	);
	const updateClientField = useCallback(
		(field, value) => dispatch({ type: 'UPDATE_CLIENT_FIELD', field, value }),
		[],
	);
	const setPrediction = useCallback(
		(data) => dispatch({ type: 'SET_PREDICTION', payload: data }),
		[],
	);
	const initScenario = useCallback(
		() => dispatch({ type: 'SET_SCENARIO', payload: { ...state.client } }),
		[state.client],
	);
	const updateScenarioField = useCallback(
		(field, value) => dispatch({ type: 'UPDATE_SCENARIO_FIELD', field, value }),
		[],
	);
	const setScenarioPrediction = useCallback(
		(data) => dispatch({ type: 'SET_SCENARIO_PREDICTION', payload: data }),
		[],
	);
	const applyScenario = useCallback(
		() => dispatch({ type: 'APPLY_SCENARIO' }),
		[],
	);
	const resetScenario = useCallback(
		() => dispatch({ type: 'RESET_SCENARIO' }),
		[],
	);
	const setLoading = useCallback(
		(v) => dispatch({ type: 'SET_LOADING', payload: v }),
		[],
	);
	const setError = useCallback(
		(msg) => dispatch({ type: 'SET_ERROR', payload: msg }),
		[],
	);
	const clear = useCallback(() => dispatch({ type: 'CLEAR' }), []);

	const value = useMemo(
		() => ({
			...state,
			setClient,
			updateClientField,
			setPrediction,
			initScenario,
			updateScenarioField,
			setScenarioPrediction,
			applyScenario,
			resetScenario,
			setLoading,
			setError,
			clear,
		}),
		[
			state,
			setClient,
			updateClientField,
			setPrediction,
			initScenario,
			updateScenarioField,
			setScenarioPrediction,
			applyScenario,
			resetScenario,
			setLoading,
			setError,
			clear,
		],
	);

	return (
		<ClientContext.Provider value={value}>{children}</ClientContext.Provider>
	);
}

export function useClient() {
	const ctx = useContext(ClientContext);
	if (!ctx) throw new Error('useClient must be used within <ClientProvider>');
	return ctx;
}
