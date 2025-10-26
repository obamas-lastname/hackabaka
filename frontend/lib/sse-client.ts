
export function SSEClient(
  onMessage: (data: any) => void, 
  onError: (error: any) => void,
  onDisconnect?: () => void
) {
	  const eventSource = new EventSource("/api/stream");
	  
	  eventSource.onmessage = (event) => {
	    const data = JSON.parse(event.data);
	    onMessage(data);
	  };
	  
	  eventSource.onerror = (error) => {
	    onError(error);
	    if (eventSource.readyState === EventSource.CLOSED) {
	      onDisconnect?.();
	    }
	  };
	  
	  return () => {
	    eventSource.close();
	  };
}
