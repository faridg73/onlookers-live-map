import { describe, expect, it } from "vitest";
import { escrowLabel, planLimit, proVisitView, remainingVisits } from "./pro-dashboard";
import type { ProVisitBooking } from "./pro-visits.functions";

const row = (overrides: Partial<ProVisitBooking> = {}): ProVisitBooking => ({ id:"1",address:"1 Main St",purpose:"Inspect property",scheduledStartAt:null,contactName:"Dana",contactPhone:"",contactEmail:"d@x.com",requestId:null,bookingStatus:"draft",requestStatus:null,requestExpiresAt:null,createdAt:new Date().toISOString(),...overrides });
describe("Pro Dashboard helpers",()=>{
  it("calculates plan limits and remaining visits",()=>{ expect(planLimit("starter")).toBe(5); expect(remainingVisits("pro",7)).toBe(13); expect(remainingVisits("team",99)).toBeNull(); expect(remainingVisits("starter",9)).toBe(0); });
  it("groups visit stages",()=>{ expect(proVisitView(row())).toBe("draft"); expect(proVisitView(row({bookingStatus:"published",requestId:"r",requestStatus:"open"}))).toBe("scheduled"); expect(proVisitView(row({bookingStatus:"published",requestId:"r",requestStatus:"claimed"}))).toBe("progress"); expect(proVisitView(row({bookingStatus:"published",requestId:"r",requestStatus:"completed"}))).toBe("completed"); });
  it("labels escrow states",()=>{ expect(escrowLabel("held",100,0)).toBe("100 Cr held"); expect(escrowLabel("released",100,85)).toBe("Paid out"); expect(escrowLabel("refunded",100,0)).toBe("Returned"); });
});