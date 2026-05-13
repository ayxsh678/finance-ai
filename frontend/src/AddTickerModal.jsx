import React, { useState, useEffect, useRef } from 'react';

const stocks = [
  { ticker: "RELIANCE.NS", name: "Reliance Industries", price: "₹1,361", change: "+0.21%", up: true },
  { ticker: "TCS.NS", name: "Tata Consultancy Services", price: "₹2,274", change: "-1.14%", up: false },
  { ticker: "HDFCBANK.NS", name: "HDFC Bank", price: "₹749", change: "-0.17%", up: false },
  { ticker: "INFY.NS", name: "Infosys", price: "₹1,123", change: "-1.48%", up: false },
  { ticker: "ICICIBANK.NS", name: "ICICI Bank", price: "₹1,236", change: "-0.34%", up: false },
  { ticker: "SBIN.NS", name: "State Bank of India", price: "₹971", change: "-0.37%", up: false },
  { ticker: "BHARTIARTL.NS", name: "Bharti Airtel", price: "₹1,842", change: "+1.12%", up: true },
  { ticker: "WIPRO.NS", name: "Wipro", price: "₹462", change: "+0.55%", up: true },
  { ticker: "AXISBANK.NS", name: "Axis Bank", price: "₹1,105", change: "-0.28%", up: false },
  { ticker: "TATAMOTORS.NS", name: "Tata Motors", price: "₹678", change: "+2.31%", up: true },
  { ticker: "MARUTI.NS", name: "Maruti Suzuki", price: "₹12,450", change: "+0.74%", up: true },
  { ticker: "SUNPHARMA.NS", name: "Sun Pharma", price: "₹1,674", change: "-0.62%", up: false },
  { ticker: "KOTAKBANK.NS", name: "Kotak Mahindra Bank", price: "₹1,932", change: "+0.19%", up: true },
  { ticker: "NTPC.NS", name: "NTPC Limited", price: "₹356", change: "+1.05%", up: true },
  { ticker: "ONGC.NS", name: "Oil & Natural Gas Corp", price: "₹241", change: "-0.83%", up: false },
  { ticker: "POWERGRID.NS", name: "Power Grid Corporation", price: "₹298", change: "+0.41%", up: true },
  { ticker: "LT.NS", name: "Larsen & Toubro", price: "₹3,487", change: "+1.22%", up: true },
  { ticker: "HCLTECH.NS", name: "HCL Technologies", price: "₹1,547", change: "-0.93%", up: false },
  { ticker: "BAJFINANCE.NS", name: "Bajaj Finance", price: "₹8,921", change: "+0.67%", up: true },
  { ticker: "ASIANPAINT.NS", name: "Asian Paints", price: "₹2,312", change: "-1.01%", up: false },
  { ticker: "CIPLA.NS", name: "Cipla", price: "₹1,456", change: "+0.89%", up: true },
  { ticker: "DIVISLAB.NS", name: "Divi's Laboratories", price: "₹3,210", change: "-0.45%", up: false },
  { ticker: "ULTRACEMCO.NS", name: "UltraTech Cement", price: "₹8,765", change: "+1.34%", up: true },
  { ticker: "GRASIM.NS", name: "Grasim Industries", price: "₹1,890", change: "-0.78%", up: false },
  { ticker: "M&M.NS", name: "Mahindra & Mahindra", price: "₹1,234", change: "+0.92%", up: true },
  { ticker: "TITAN.NS", name: "Titan Company", price: "₹2,345", change: "-1.23%", up: false },
  { ticker: "BAJAJ-AUTO.NS", name: "Bajaj Auto", price: "₹4,567", change: "+0.67%", up: true },
  { ticker: "HEROMOTOCO.NS", name: "Hero MotoCorp", price: "₹3,456", change: "-0.34%", up: false },
  { ticker: "DRREDDY.NS", name: "Dr. Reddy's Laboratories", price: "₹5,678", change: "+1.45%", up: true },
  { ticker: "HINDALCO.NS", name: "Hindalco Industries", price: "₹456", change: "-0.89%", up: false },
  { ticker: "JSWSTEEL.NS", name: "JSW Steel", price: "₹789", change: "+0.56%", up: true },
  { ticker: "COALINDIA.NS", name: "Coal India", price: "₹234", change: "-1.12%", up: false },
  { ticker: "BANKBARODA.NS", name: "Bank of Baroda", price: "₹167", change: "+0.78%", up: true },
  { ticker: "IRCTC.NS", name: "IRCTC", price: "₹890", change: "-0.45%", up: false },
  { ticker: "INDIGO.NS", name: "InterGlobe Aviation", price: "₹2,123", change: "+1.23%", up: true },
  { ticker: "ZOMATO.NS", name: "Zomato", price: "₹78", change: "-2.34%", up: false },
  { ticker: "PAYTM.NS", name: "Paytm", price: "₹456", change: "+0.67%", up: true },
  { ticker: "ADANIPORTS.NS", name: "Adani Ports", price: "₹789", change: "-0.89%", up: false },
  { ticker: "ADANIGREEN.NS", name: "Adani Green Energy", price: "₹1,234", change: "+1.45%", up: true },
  { ticker: "TATASTEEL.NS", name: "Tata Steel", price: "₹123", change: "-0.56%", up: false },
  { ticker: "TATAPOWER.NS", name: "Tata Power", price: "₹234", change: "+0.78%", up: true },
  { ticker: "BHEL.NS", name: "BHEL", price: "₹67", change: "-1.23%", up: false },
  { ticker: "FSN.NS", name: "Nykaa - FSN E-Commerce", price: "₹123", change: "+2.34%", up: true },
  { ticker: "POLICYBZR.NS", name: "PB Fintech", price: "₹890", change: "-0.67%", up: false },
  { ticker: "DELHIVERY.NS", name: "Delhivery", price: "₹345", change: "+1.12%", up: true },
  { ticker: "OLAMOBILITY.NS", name: "Ola Electric Mobility", price: "₹67", change: "-3.45%", up: false },
];

const AddTickerModal = ({ isOpen, onClose, onAdd, watchlist = [] }) => {
  const [tickerInput, setTickerInput] = useState('');
  const [companyInput, setCompanyInput] = useState('');
  const [filteredStocks, setFilteredStocks] = useState([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const q = tickerInput.trim().toUpperCase();
    if (!q) {
      setFilteredStocks([]);
      return;
    }
    const filtered = stocks.filter(s =>
      s.ticker.toUpperCase().includes(q) || s.name.toUpperCase().includes(q)
    ).slice(0, 6);
    setFilteredStocks(filtered);
    setActiveIdx(-1);
  }, [tickerInput]);

  const handleSelect = (stock) => {
    setTickerInput(stock.ticker);
    setCompanyInput(stock.name);
    setFilteredStocks([]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(prev => Math.min(prev + 1, filteredStocks.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && activeIdx >= 0 && filteredStocks[activeIdx]) {
      handleSelect(filteredStocks[activeIdx]);
    } else if (e.key === 'Escape') {
      setFilteredStocks([]);
    }
  };

  const handleAdd = () => {
    if (tickerInput.trim()) {
      const tickerUpper = tickerInput.trim().toUpperCase();
      if (watchlist.some(s => s.ticker === tickerUpper)) {
        alert("Already in watchlist");
        return;
      }
      onAdd(tickerUpper, companyInput.trim());
      onClose();
      setTickerInput('');
      setCompanyInput('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Add Ticker</span>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="input-wrapper">
          <input
            ref={inputRef}
            className="ticker-input"
            type="text"
            placeholder="TICKER.NS"
            value={tickerInput}
            onChange={(e) => setTickerInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <span className="search-icon">🔍</span>
        </div>

        {filteredStocks.length > 0 && (
          <div className="suggestions visible">
            {filteredStocks.map((stock, idx) => (
              <div
                key={stock.ticker}
                className={`suggestion-item ${idx === activeIdx ? 'active' : ''}`}
                onClick={() => handleSelect(stock)}
              >
                <div className="suggestion-left">
                  <span className="ticker-badge">{stock.ticker}</span>
                  <span className="company-name">{stock.name}</span>
                </div>
                <div className="suggestion-right">
                  <div className="price">{stock.price}</div>
                  <div className={stock.up ? 'change-up' : 'change-down'}>{stock.change}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tickerInput.trim() && filteredStocks.length === 0 && (
          <div className="suggestions visible">
            <div className="no-results">No matching tickers found</div>
          </div>
        )}

        <input
          className="company-input"
          type="text"
          placeholder="Company name (optional)"
          value={companyInput}
          onChange={(e) => setCompanyInput(e.target.value)}
        />

        <button
          className="add-btn"
          disabled={tickerInput.trim().length < 2}
          onClick={handleAdd}
        >
          Add to Watchlist
        </button>
      </div>
    </div>
  );
};

export default AddTickerModal;