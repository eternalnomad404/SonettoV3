"""
Test Sarvam AI transcription with chunking for long audio.

Tests:
1. Test100 (31 seconds) - Should use 2 chunks (28s + 3s)
2. MVI_8933 (1064 seconds = ~18 minutes) - Should use ~38 chunks
"""

import requests
import json

# API endpoint
BASE_URL = "http://localhost:8000"

def test_transcription(session_id: str, session_name: str, expected_duration: int):
    """Test transcription for a session."""
    print(f"\n{'='*80}")
    print(f"Testing: {session_name} ({expected_duration}s)")
    print(f"Session ID: {session_id}")
    print('='*80)
    
    # Trigger transcription
    url = f"{BASE_URL}/sessions/{session_id}/transcribe"
    
    print("\n📡 Sending transcription request...")
    response = requests.post(url, timeout=600)  # 10-minute timeout for long audio
    
    print(f"\n✅ Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"\n✅ Success: {data.get('message', 'No message')}")
        
        segments = data.get('transcript', {}).get('segments', [])
        print(f"\n📝 Transcript Segments: {len(segments)}")
        
        if segments:
            print(f"\n--- First 3 segments ---")
            for seg in segments[:3]:
                print(f"  [{seg['timestamp']}] {seg['speaker']}: {seg['text'][:80]}...")
            
            if len(segments) > 3:
                print(f"\n--- Last segment ---")
                last = segments[-1]
                print(f"  [{last['timestamp']}] {last['speaker']}: {last['text'][:80]}...")
                
            # Save full transcript to file
            output_file = f"transcript_{session_name}.json"
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            print(f"\n💾 Full transcript saved to: {output_file}")
    else:
        print(f"\n❌ Error: {response.text}")
        
    print('\n')


if __name__ == "__main__":
    # Test 1: 31-second audio (should chunk into 2 parts)
    test_transcription(
        session_id="95603440-a6fe-4167-9af8-9797b56bc411",
        session_name="Test100",
        expected_duration=31
    )
    
    # Test 2: 18-minute audio (should chunk into ~38 parts)
    print("\n⏳ Waiting 3 seconds before next test...")
    import time
    time.sleep(3)
    
    test_transcription(
        session_id="4a03fe22-36e0-4544-96d4-ef6571aa1ff3",
        session_name="MVI_8933",
        expected_duration=1064
    )
